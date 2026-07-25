// src/routes/screeningRoutes.js

const express = require("express");
const { screenResume, getScreeningResults, getScreeningById, makeDecision, generateEmail, bulkScreen, deleteScreening } = require("../controllers/screeningController");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");

const router = express.Router();

// All screening routes require authentication
router.use(authMiddleware);

// READ: any authenticated user (controller scopes to their own jobs)
router.get("/job/:jobId", getScreeningResults);
router.get("/:id", getScreeningById);

// WRITE: only recruiters and admins can trigger screening
router.post("/", authorize("recruiter", "admin"), screenResume);

// BULK SCREEN: endpoint to screen multiple resumes for a job at once
router.post("/bulk", authorize("recruiter", "admin"), bulkScreen);

// DECISION: hiring managers, recruiters, and admins can record a decision
router.put("/:id/decision", authorize("hiring_manager", "recruiter", "admin"), makeDecision);

// EMAIL: generate email draft for a screening result
router.post("/:id/generate-email", authorize("hiring_manager", "recruiter", "admin"), generateEmail);

// DELETE: manual cleanup of screening results
router.delete("/:id", authorize("recruiter", "admin"), deleteScreening);

module.exports = router;
