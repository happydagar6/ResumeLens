// src/routes/pipelineRoutes.js

const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const { screenSingle, screenBatch, getPipelineStatus, rescreenSingle, cancelBatch } = require("../controllers/pipelineController");

const router = express.Router();

// All pipeline routes require authentication
router.use(authMiddleware);

// READ: any authenticated user can check pipeline status
router.get("/status/:resumeId", getPipelineStatus);

// WRITE: only recruiters and admins can trigger AI screening
router.post("/screen", authorize("recruiter", "admin"), screenSingle);
router.post("/rescreen", authorize("recruiter", "admin"), rescreenSingle);
router.post("/batch-screen", authorize("recruiter", "admin"), screenBatch);
router.post("/cancel-batch", authorize("recruiter", "admin"), cancelBatch);

module.exports = router;