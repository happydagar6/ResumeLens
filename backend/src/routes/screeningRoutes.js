// src/routes/screeningRoutes.js

const express = require("express");
const {
  screenResume,
  getScreeningResults,
  getScreeningById,
  makeDecision,
  generateEmail,
  bulkScreen,
  deleteScreening,
  chatAboutScreening,
} = require("../controllers/screeningController");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");

const router = express.Router();

// All screening routes require authentication
router.use(authMiddleware);

// READ: any authenticated user (controller scopes to their own jobs)
router.get("/job/:jobId", getScreeningResults);
router.get("/:id", getScreeningById);

// GET /api/screening/:id/audit-logs
// Returns the timeline events for a specific resume
router.get("/:id/audit-logs", authorize("recruiter", "admin", "hiring_manager"), async (req, res, next) => {
  try {
    const AuditLog = require("../models/auditLogModel");
    const logs = await AuditLog.find({ resumeId: req.params.id })
      .populate("performedBy", "name email") // Get the name of who did it
      .sort({ createdAt: 1 }); // Oldest first, for a top-to-bottom timeline
    
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
});

// WRITE: only recruiters and admins can trigger screening
router.post("/", authorize("recruiter", "admin"), screenResume);

// BULK SCREEN: endpoint to screen multiple resumes for a job at once
router.post("/bulk", authorize("recruiter", "admin"), bulkScreen);

// CHAT: conversational AI about a specific candidate's resume
router.post("/:id/chat", authorize("hiring_manager", "recruiter", "admin"), chatAboutScreening);

// DECISION: hiring managers, recruiters, and admins can record a decision
router.put(
  "/:id/decision",
  authorize("hiring_manager", "recruiter", "admin"),
  makeDecision,
);

// EMAIL: generate email draft for a screening result
router.post(
  "/:id/generate-email",
  authorize("hiring_manager", "recruiter", "admin"),
  generateEmail,
);

// DELETE: manual cleanup of screening results
router.delete("/:id", authorize("recruiter", "admin"), deleteScreening);

module.exports = router;
