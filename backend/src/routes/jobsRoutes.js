// src/routes/jobsRoutes.js

const express = require("express");
const { createJob, getJobs, getJobById, updateJob, deleteJob } = require("../controllers/jobsController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post("/", createJob);
router.get("/", getJobs);
router.get("/:id", getJobById);
router.put("/:id", updateJob);
router.delete("/:id", deleteJob);

module.exports = router;