// src/index.js
const dotenv = require('dotenv');
dotenv.config(); // Load env vars BEFORE any other imports that use them

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require("helmet");
const mongoSanitizeMiddleware = require('./middleware/mongoSanitizeMiddleware');
const xssMiddleware = require('./middleware/xssMiddleware');
const { connectDB } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');
const { globalRateLimiter } = require('./middleware/rateLimiter');
const authRoutes = require('./routes/authRoutes');
const jobsRoutes = require('./routes/jobsRoutes');
const resumesRoutes = require('./routes/resumeRoutes');
const screeningRoutes = require('./routes/screeningRoutes');
const questionsRoutes = require('./routes/questionsRoutes');
const pipelineRoutes = require('./routes/pipelineRoutes');
const statsRoutes = require('./routes/statsRoutes');
const usersRoutes = require('./routes/usersRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const publicRoutes = require('./routes/publicRoutes');
const interviewRoutes = require("./routes/interviewRoutes");
const { addClient, removeClient } = require('./services/sseService');
const authMiddleware = require('./middleware/authMiddleware');


const app = express();

// Trust the reverse proxy (Render) so secure cookies can be set
app.set('trust proxy', 1);

// Set hardened security HTTP headers (HSTS, clickjacking prevention, MIME sniffing defense)
app.use(
  helmet({
    contentSecurityPolicy: false, // Handled per frontend deployment
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: "deny" }, // Clickjacking prevention
    noSniff: true,                  // MIME type sniffing prevention
  })
);

// ── Strict CORS Policy ────────────────────────────────────────────────────────
const configuredOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""));

const allowedOrigins = Array.from(
  new Set([...configuredOrigins, "http://localhost:3000", "http://127.0.0.1:3000"])
);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, curl, server-to-server) with no origin header
    if (!origin) return callback(null, true);
    const normalized = origin.trim().replace(/\/$/, "");
    if (allowedOrigins.includes(normalized)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked: Origin ${origin} is not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  exposedHeaders: ["RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset", "Retry-After"],
  maxAge: 86400, // 24 hours preflight cache
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection (Custom Recursive Middleware)
app.use(mongoSanitizeMiddleware);

// Data sanitization against XSS (Custom Recursive Middleware)
app.use(xssMiddleware);

app.use(requestLogger); // 6- log incoming requests: custom middleware to log details about each incoming HTTP request (e.g., method, URL, timestamp).
app.use(globalRateLimiter); // 7- limit request rates: distributed Redis-backed rate limiter
app.use("/uploads", express.static("uploads")); // 8- serve static files: makes files in the "uploads" directory accessible via HTTP.

// Root route
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Welcome to ResumeLens API",
        endpoints: {
            health: "/api/health",
            auth: "/api/auth",
            jobs: "/api/jobs",
            resumes: "/api/resumes",
            screening: "/api/screening",
            questions: "/api/questions",
            pipeline: "/api/pipeline",
            stats: "/api/stats",
            admin: "/api/admin",
        },
    });
});

// Health check
app.get("/api/health", (req, res) => {
    res.json({ success: true, message: "ResumeLens API is running" });
}); // 9- health check: checks if the API is running and responsive.

// Queue health — shows current BullMQ stats
app.get("/api/health/queue", async (req, res) => {
    try {
        const { getQueueStats } = require("./services/backgroundQueue");
        const stats = await getQueueStats();
        res.json({ success: true, queue: stats });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});


// ── SSE: Real-time push events ────────────────────────────────────────────────
// GET /api/events
// The browser connects here once and keeps the connection open.
// The server pushes events over this connection whenever something happens
// (e.g. BullMQ finishes screening a resume).
app.get("/api/events", authMiddleware, (req, res) => {
    const userId = req.user.id; // 10- server-sent events: enables real-time communication between the server and clients by sending events over a persistent HTTP connection.

    // These headers tell the browser: "This is a stream, keep the connection open"
    res.setHeader("Content-Type", "text/event-stream"); // 11- event stream: specifies the content type as an event stream, which is a way to send multiple events over a single HTTP connection.
    res.setHeader("Cache-Control", "no-cache"); // 12- cache control: prevents the browser from caching the events, ensuring that the latest events are always displayed.
    res.setHeader("Connection", "keep-alive"); // 13- connection: keeps the connection open, allowing the server to send events to the client in real-time.
    res.setHeader("X-Accel-Buffering", "no"); // Important for Nginx reverse proxies
    res.flushHeaders(); // Send headers immediately, don't wait for a body

    // Register this browser tab as a connected client
    addClient(userId, res);

    // Send an initial "connected" event so the browser knows it's working
    res.write(`event: connected\ndata: ${JSON.stringify({ userId, message: "SSE connection established" })}\n\n`);

    // When the browser disconnects (tab closed, navigation, etc.) — clean up
    req.on("close", () => {
        removeClient(userId, res);
    });
});


// Routes
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobsRoutes);
app.use("/api/resumes", resumesRoutes);
app.use("/api/screening", screeningRoutes);
app.use("/api/questions", questionsRoutes);
app.use("/api/pipeline", pipelineRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/interviews', interviewRoutes);

// ── 404 Catch-All Route for Undefined Endpoints ──────────────────────────────
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
});

// Error handler (must be last)
app.use(errorHandler);

// ── Startup Security & Health Checks ─────────────────────────────────────────
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
    console.warn("⚠️ [SECURITY WARNING] JWT_SECRET is missing or less than 16 characters. Configure a strong secret in production.");
}

// Start the server
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
    app.listen(PORT, () => console.log(`ResumeLens server running on port ${PORT}`));
}).catch((err) => {
    console.error("DB connection failed", err);
    process.exit(1);
});

// ── Graceful Shutdown ──────────────────────────────────────────────────────────
const { shutdownQueue } = require("./services/backgroundQueue");

async function gracefulShutdown(signal) {
    console.log(`\n[Server] ${signal} received — shutting down background queue...`);
    await shutdownQueue();
    console.log("[Server] Shutdown complete. Goodbye!");
    process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT",  () => gracefulShutdown("SIGINT"));