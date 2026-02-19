// src/routes/statsRoutes.js

const express = require("express");
const { getOverviewStats, getJobStats } = require("../controllers/statsController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Protect all stats routes — must be logged in
router.use(authMiddleware);

// GET /api/stats/overview
// Returns site-wide aggregate stats: total jobs, resumes, avg score, etc.
router.get("/overview", getOverviewStats);

// GET /api/stats/job/:jobId
// Returns per-job stats: resume counts, score stats, top candidates.
router.get("/job/:jobId", getJobStats);

module.exports = router;
