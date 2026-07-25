// src/routes/statsRoutes.js

const express = require("express");
const { getOverviewStats, getJobStats, getActivityFeed, clearActivityFeed } = require("../controllers/statsController");
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

// GET /api/stats/activity-feed
// Returns recent activity across the platform for the dashboard feed
router.get("/activity", getActivityFeed);

// DELETE /api/stats/activity
// Clears the activity feed for the logged in user
router.delete("/activity", clearActivityFeed);

module.exports = router;
