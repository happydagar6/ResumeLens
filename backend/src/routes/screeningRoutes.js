// src/routes/screeningRoutes.js

const express = require("express");
const { screenResume, getScreeningResults, getScreeningById } = require("../controllers/screeningController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post("/", screenResume);
router.get("/job/:jobId", getScreeningResults);
router.get("/:id", getScreeningById);

module.exports = router;
