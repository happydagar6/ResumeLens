// src/index.js
const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cors = require('cors'); // Add to deps if needed: pnpm add cors
const { connectDB } = require('./config/database');
const errorHandler = require('./middleware/error-handler');
const requestLogger = require('./middleware/request-logger');
const rateLimiter = require('./middleware/rate-limiter');
const authRoutes = require('./routes/auth.routes');
const jobsRoutes = require('./routes/jobs.routes');
const resumesRoutes = require('./routes/resumes.routes');
const screeningRoutes = require('./routes/screening.routes');
const questionsRoutes = require('./routes/questions.routes');

dotenv.config(); // Load environment variables from .env file
const app = express();


// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(rateLimiter); // Using express-rate-limit for rate limiting
app.use(express.json()); // Parse JSON request bodies
app.use("/uploads", express.static("uploads")); // For temp files if needed

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobsRoutes);
app.use("/api/resumes", resumesRoutes);
app.use("/api/screening", screeningRoutes);
app.use("/api/questions", questionsRoutes);

// Error handler
app.use(errorHandler);

// Start the server
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch((err) => {
    console.error("DB connection failed", err);
});