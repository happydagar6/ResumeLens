// src/routes/interviewRoutes.js

const express = require("express");
const {
  scheduleInterview,
  getCandidateInterviews,
  updateInterview,
  cancelInterview,
  getUpcomingInterviews,
} = require("../controllers/interviewController");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");

const router = express.Router();

// 1. Authentication Guard: User must be logged in with a valid JWT
router.use(authMiddleware);

// 2. Role Authorization: Only recruiters, hiring managers, and admins can manage interviews
router.use(authorize("recruiter", "hiring_manager", "admin"));

// ── Endpoints ─────────────────────────────────────────────────────────────────

// GET /api/interviews
// Returns upcoming scheduled interviews agenda for the recruiter's jobs
router.get("/", getUpcomingInterviews);

// GET /api/interviews/candidate/:resumeId
// Returns all interview rounds for a specific candidate profile
router.get("/candidate/:resumeId", getCandidateInterviews);

// POST /api/interviews
// Schedules a new interview round, triggers stage update, audit log & email
router.post("/", scheduleInterview);

// PUT /api/interviews/:id
// Reschedules an interview or updates its status (e.g. marks as completed)
router.put("/:id", updateInterview);

// DELETE /api/interviews/:id
// Cancels an interview round (soft-cancel with audit logging)
router.delete("/:id", cancelInterview);

module.exports = router;