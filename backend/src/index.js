// src/index.js
const dotenv = require('dotenv');
dotenv.config(); // Load env vars BEFORE any other imports that use them

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
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

const app = express();

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestLogger);
app.use(rateLimiter);
app.use("/uploads", express.static("uploads"));

// Root route
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Welcome to RecruitAI API",
        endpoints: {
            health: "/api/health",
            auth: "/api/auth",
            jobs: "/api/jobs",
            resumes: "/api/resumes",
            screening: "/api/screening",
            questions: "/api/questions",
            pipeline: "/api/pipeline",
            stats: "/api/stats",
        },
    });
});

// Health check
app.get("/api/health", (req, res) => {
    res.json({ success: true, message: "RecruitAI API is running" });
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

// Error handler (must be last)
app.use(errorHandler);

// Start the server
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
    app.listen(PORT, () => console.log(`RecruitAI server running on port ${PORT}`));
}).catch((err) => {
    console.error("DB connection failed", err);
    process.exit(1);
});