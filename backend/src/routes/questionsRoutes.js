// src/routes/questionsRoutes.js

const express = require("express");
const { generateQuestions, getQuestionsByScreening } = require("../controllers/questionsController");
// const authMiddleware = require("../middleware/authMiddleware"); // Auth disabled for now

const router = express.Router();

// router.use(authMiddleware); // TODO: Re-enable auth later

router.post("/generate", generateQuestions);
router.get("/screening/:screeningId", getQuestionsByScreening);

module.exports = router;
