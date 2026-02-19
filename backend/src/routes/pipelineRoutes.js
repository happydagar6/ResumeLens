// src/routes/pipelineRoutes.js

const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { screenSingle, screenBatch, getPipelineStatus } = require("../controllers/pipelineController");

const router = express.Router();

// All pipeline routes require authentication
router.use(authMiddleware);

// Post /api/pipeline/screen - run full screening pipeline for a single resume
router.post("/screen", screenSingle);

// POST /api/pipeline/batch-screen - run screening pipeline for all unscreened resumes of a job
router.post("/batch-screen", screenBatch);

// GET /api/pipeline/status/:resumeId - get current status of the screening pipeline for a resume
router.get("/status/:resumeId", getPipelineStatus);

module.exports = router;