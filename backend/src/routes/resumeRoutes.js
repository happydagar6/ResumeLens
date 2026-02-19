// src/routes/resumeRoutes.js

const express = require("express");
const upload = require("../config/multer");
const { uploadResume, getResumesByJob, getResumeById, deleteResume } = require("../controllers/resumeController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post("/upload", upload.single("resume"), uploadResume);
router.get("/job/:jobId", getResumesByJob);
router.get("/:id", getResumeById);
router.delete("/:id", deleteResume);

module.exports = router;
