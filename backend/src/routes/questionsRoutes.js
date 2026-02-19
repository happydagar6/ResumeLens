// src/routes/questionsRoutes.js

const express = require("express");
const { generateQuestions, getQuestionsByScreening } = require("../controllers/questionsController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post("/generate", generateQuestions);
router.get("/screening/:screeningId", getQuestionsByScreening);

module.exports = router;
