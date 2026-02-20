// src/routes/resumeRoutes.js

const express = require("express");
const upload = require("../config/multer");
const { uploadResume, getResumesByJob, getResumeById, deleteResume } = require("../controllers/resumeController");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");

const router = express.Router();

// All resume routes require authentication
router.use(authMiddleware);

// READ: any authenticated user (controller scopes to their own jobs)
router.get("/job/:jobId", getResumesByJob);
router.get("/:id", getResumeById);

// WRITE: only recruiters and admins can upload/delete resumes
router.post("/upload", authorize("recruiter", "admin"), upload.single("resume"), uploadResume);
router.delete("/:id", authorize("recruiter", "admin"), deleteResume);

module.exports = router;
