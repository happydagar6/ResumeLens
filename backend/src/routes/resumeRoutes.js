// src/routes/resumeRoutes.js

const express = require("express");
const multer = require("multer");
const path = require("path");
const { uploadResume, getResumesByJob, getResumeById, deleteResume } = require("../controllers/resumeController");
// const authMiddleware = require("../middleware/authMiddleware"); // Auth disabled for now

const router = express.Router();

// Multer config for PDF uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "../uploads"));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + "-" + file.originalname);
    },
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
        cb(null, true);
    } else {
        cb(new Error("Only PDF files are allowed"), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

// router.use(authMiddleware); // TODO: Re-enable auth later

router.post("/upload", upload.single("resume"), uploadResume);
router.get("/job/:jobId", getResumesByJob);
router.get("/:id", getResumeById);
router.delete("/:id", deleteResume);

module.exports = router;
