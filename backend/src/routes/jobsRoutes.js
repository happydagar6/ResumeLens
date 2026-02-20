// src/routes/jobsRoutes.js

const express = require("express");
const { createJob, getJobs, getJobById, updateJob, deleteJob } = require("../controllers/jobsController");
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

module.exports = router;