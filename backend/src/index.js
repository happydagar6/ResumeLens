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
const rateLimiter = require('./middleware/rateLimiter');
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
app.set('trust proxy', 1); // 1- enable trust proxy: configure the Express application to trust the first proxy (e.g., Render's load balancer).

// Set security HTTP headers
app.use(helmet()); // 2- use helmet: applies various security-related middleware (e.g., setting secure HTTP headers, preventing clickjacking).

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json()); // 3- parse JSON request bodies: enables the application to parse JSON-formatted data sent in request bodies.
app.use(express.urlencoded({ extended: true })); // 4- parse URL-encoded request bodies: allows the application to parse data submitted through HTML forms.
app.use(cookieParser()); // 5- parse cookies: enables the application to read and parse cookies sent with requests.

// Data sanitization against NoSQL query injection (Custom Recursive Middleware)
app.use(mongoSanitizeMiddleware);

// Data sanitization against XSS (Custom Recursive Middleware)
app.use(xssMiddleware);

app.use(requestLogger); // 6- log incoming requests: custom middleware to log details about each incoming HTTP request (e.g., method, URL, timestamp).
app.use(rateLimiter); // 7- limit request rates: middleware to prevent abuse by limiting the number of requests from a single IP address within a specific time window.
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

// Error handler (must be last)
app.use(errorHandler);

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