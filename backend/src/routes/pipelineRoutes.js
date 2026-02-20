// src/routes/pipelineRoutes.js

const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const { screenSingle, screenBatch, getPipelineStatus } = require("../controllers/pipelineController");

const router = express.Router();

// All pipeline routes require authentication
router.use(authMiddleware);

// READ: any authenticated user can check pipeline status
router.get("/status/:resumeId", getPipelineStatus);

// WRITE: only recruiters and admins can trigger AI screening
router.post("/screen", authorize("recruiter", "admin"), screenSingle);
router.post("/batch-screen", authorize("recruiter", "admin"), screenBatch);

module.exports = router;