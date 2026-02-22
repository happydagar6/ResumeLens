// src/routes/jobsRoutes.js

const express = require("express");
const { createJob, getJobs, getJobById, updateJob, deleteJob, assignJob } = require("../controllers/jobsController");
const { getJobAnalytics } = require("../controllers/statsController");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");

const router = express.Router();

// All jobs routes require authentication
router.use(authMiddleware);

// READ: any authenticated user can query (controller scopes to their own data)
router.get("/", getJobs);
router.get("/:id", getJobById);

// WRITE: only recruiters and admins can create/update/delete
router.post("/", authorize("recruiter", "admin"), createJob);
router.put("/:id", authorize("recruiter", "admin"), updateJob);
router.delete("/:id", authorize("recruiter", "admin"), deleteJob);

// ASSIGN: recruiters and admins can assign/remove hiring managers
router.put("/:id/assign", authorize("recruiter", "admin"), assignJob);

// ANALYTICS: pipeline funnel for a specific job
router.get("/:id/analytics", getJobAnalytics);

module.exports = router;