// src/routes/questionsRoutes.js

const express = require("express");
const {
    generateQuestions,
    getQuestionsByScreening,
    generateBatch,
    getQuestionBank,
    toggleQuestionUsed,
} = require("../controllers/questionsController");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");

const router = express.Router();

// All question routes require authentication
router.use(authMiddleware);

// READ
router.get("/bank/:jobId", getQuestionBank);
router.get("/screening/:screeningId", getQuestionsByScreening);

// WRITE: generate questions (single or batch)
router.post("/generate", authorize("recruiter", "admin", "hiring_manager"), generateQuestions);
router.post("/generate-batch", authorize("recruiter", "admin", "hiring_manager"), generateBatch);

// TOGGLE used status on a specific question
router.patch("/:docId/toggle-used", authorize("recruiter", "admin", "hiring_manager"), toggleQuestionUsed);

module.exports = router;
