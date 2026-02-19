// src/routes/questionsRoutes.js

const express = require("express");
const { generateQuestions, getQuestionsByScreening, generateBatch } = require("../controllers/questionsController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post("/generate", generateQuestions);
router.get("/screening/:screeningId", getQuestionsByScreening);
router.post("/generate-batch", generateBatch);

module.exports = router;
