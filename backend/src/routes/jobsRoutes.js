// src/routes/jobsRoutes.js

const express = require("express");
const { createJob, getJobs, getJobById, updateJob, deleteJob } = require("../controllers/jobsController");
// const authMiddleware = require("../middleware/authMiddleware"); // Auth disabled for now

const router = express.Router();

// router.use(authMiddleware); // TODO: Re-enable auth later

router.post("/", createJob);
router.get("/", getJobs);
router.get("/:id", getJobById);
router.put("/:id", updateJob);
router.delete("/:id", deleteJob);

module.exports = router;