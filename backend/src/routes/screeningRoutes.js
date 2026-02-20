// src/routes/screeningRoutes.js

const express = require("express");
const { screenResume, getScreeningResults, getScreeningById } = require("../controllers/screeningController");
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

module.exports = router;
