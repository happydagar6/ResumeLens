// src/middleware/rateLimiter.js

const rateLimit = require("express-rate-limit");

const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: {
        success: false,
        message: "Too many requests, please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = rateLimiter;
