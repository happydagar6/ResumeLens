// backend/src/middleware/rateLimiter.js
const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { createRedisConnection } = require("../config/redis");

// 1. Initialize a shared Redis connection for rate limiting
let redisClient = null;
try {
    redisClient = createRedisConnection();
} catch (err) {
    console.error("⚠️ Failed to initialize Redis connection for rate limiter:", err.message);
}

/**
 * Factory function to create distributed, Redis-backed rate limiters.
 * If Redis is unavailable, it automatically falls back to in-memory storage
 * to guarantee that legitimate users are never blocked due to cache issues.
 *
 * @param {Object} options Configuration options
 * @param {number} options.windowMs Time window in milliseconds (e.g. 15 * 60 * 1000 for 15 mins)
 * @param {number} options.max Max requests allowed within the window per client
 * @param {string} options.message Error message returned when limit is exceeded
 * @param {string} options.prefix Redis key prefix to separate different routes (e.g. "rl:auth:")
 * @param {Function} [options.keyGenerator] Custom function to identify the client (e.g. IP or userId)
 */
function createRateLimiter({
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = "Too many requests. Please slow down and try again later.",
    prefix = "rl:global:",
    keyGenerator = undefined,
}) {
    // 2. Configure the Redis store if Redis is connected
    let store = undefined;
    if (redisClient) {
        store = new RedisStore({
            // sendCommand passes Redis commands directly through ioredis
            sendCommand: (...args) => redisClient.call(...args),
            prefix: prefix,
        });
    }

    return rateLimit({
        windowMs,
        max: process.env.NODE_ENV === "development" ? max * 10 : max, // Generous limit in dev to prevent friction
        message: {
            success: false,
            message,
        },
        standardHeaders: true, // Returns modern RateLimit-* headers (RFC standard)
        legacyHeaders: false,   // Disables old X-RateLimit-* headers
        store,                  // Uses RedisStore if available; defaults to MemoryStore otherwise
        keyGenerator,           // Custom IP or User ID resolver (if provided)
        validate: {
            keyGeneratorIpFallback: false,
        },
        handler: (req, res, next, options) => {
            // Return structured JSON consistent with the rest of ResumeLens API
            res.status(429).json({
                success: false,
                message: options.message.message || options.message,
                retryAfter: Math.ceil(options.windowMs / 1000),
            });
        },
    });
}

// 3. Default Global Rate Limiter (Tier 0: protects entire API from general flooding)
const globalRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,                  // 200 requests per 15 min per IP
    prefix: "rl:global:",
    message: "Too many requests from this IP. Please try again after 15 minutes.",
});

// Login Limiter: Protects against credentials stuffing and password brute forcing
const loginLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes window
    max: 5,
    prefix: "rl:auth:login:",
    message: "Too many login attempts. For security reasons, please try again in 15 minutes.",
});

// Signup limiter: Prevent bot creation of spam accounts and organizations
const signupLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 5,
    prefix: "rl:auth:signup:",
    message: "Too many accounts created from this IP. Please try again after an hour.",
});

// Forgot password limiter: Protects email service (Resend) from quota exhausation and email spam.
const forgotPasswordLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 3,
    prefix: "rl:auth:forgot:",
    message: "Too many password reset requests. Please wait an hour before requesting again.",
});

// Reset password limiter: Prevents brute forcing password reset token
const resetPasswordLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes window
    max: 5,
    prefix: "rl:auth:reset:",
    message: "Too many password reset attempts. Please try again after 15 minutes.",
});

// Refresh Token limiter: Protects token rotation endpoint from hammering
const refreshLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minute window
    max: 30,
    prefix: "rl:auth:refresh:",
    message: "Too many token refresh requests. Please log in again.",
});

// 1. Public Apply Limiter: Strict limit to prevent unauthenticated RAM buffering,
// Cloudinary storage flooding, and OpenAI token depletion.
const publicApplyLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 3,
    prefix: "rl:public:apply:",
    message: "You have submitted multiple applications recently. Please wait an hour before submitting another.",
});

// 2. Public Read Limiter: Prevents scraping of public job listings and candidate status pages
const publicReadLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minute window
    max: 60,
    prefix: "rl:public:read:",
    message: "Too many page views. Please slow down and try again in a feq minutes.",
});


// ── Tier 3: High-Cost AI Operations & Pipeline Limiters ───────────────────────
// 1. Batch Screening Limiter: Caps bulk AI screening jobs per recruiter
const pipelineBatchLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 30, // max 30 batch screenings per hour per user
    prefix: "rl:ai:batch:",
    keyGenerator: (req) => req.user?.id || req.ip, // Key by authenticated user ID
    message: "Batch screening quota reached for this hour. Please wait before screening another batch.",
});

// 2. Single Screening Limiter: Caps individual screening and rescreening calls
const pipelineSingleLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 60,                  // Max 60 single screens per hour per user
    prefix: "rl:ai:single:",
    keyGenerator: (req) => req.user?.id || req.ip,
    message: "Single screening limit reached for this hour. Please wait a while before triggering more.",
});
// 3. AI Chat Limiter: Prevents infinite conversation loops and LLM token exhaustion
const aiChatLimiter = createRateLimiter({
    windowMs: 10 * 60 * 1000, // 10 minutes window
    max: 20,                  // Max 20 messages per 10 minutes per user
    prefix: "rl:ai:chat:",
    keyGenerator: (req) => req.user?.id || req.ip,
    message: "You have sent too many messages to the AI assistant. Please wait a few minutes before asking more questions.",
});

// ── Tier 4: Outbound Communication & Email Quota Limiters ─────────────────────

// 1. Candidate Decision Email Limiter: Protects Resend quota and domain reputation
const emailDispatchLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 20,                  // Max 20 emails dispatched per hour per recruiter
    prefix: "rl:comm:email:",
    keyGenerator: (req) => req.user?.id || req.ip,
    message: "Email dispatch hourly limit reached. Please wait before sending more candidate notifications.",
});

// 2. Interview Scheduling Limiter: Protects against calendar spam and duplicate invites
const interviewScheduleLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 25,                  // Max 25 interview invites scheduled per hour per recruiter
    prefix: "rl:comm:interview:",
    keyGenerator: (req) => req.user?.id || req.ip,
    message: "Interview scheduling limit reached for this hour. Please slow down and try again later.",
});


module.exports = {
    createRateLimiter,
    globalRateLimiter,
    loginLimiter,
    signupLimiter,
    forgotPasswordLimiter,
    resetPasswordLimiter,
    refreshLimiter,
    publicApplyLimiter,
    publicReadLimiter,
    pipelineBatchLimiter,
    pipelineSingleLimiter,
    aiChatLimiter,
    emailDispatchLimiter,
    interviewScheduleLimiter,
};