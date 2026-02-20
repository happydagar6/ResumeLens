// src/routes/questionsRoutes.js

const express = require("express");
const { generateQuestions, getQuestionsByScreening, generateBatch } = require("../controllers/questionsController");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");

const router = express.Router();

// All question routes require authentication
router.use(authMiddleware);

// READ: any authenticated user
router.get("/screening/:screeningId", getQuestionsByScreening);

// WRITE: only recruiters and admins can generate questions
router.post("/generate", authorize("recruiter", "admin"), generateQuestions);
router.post("/generate-batch", authorize("recruiter", "admin"), generateBatch);

module.exports = router;
