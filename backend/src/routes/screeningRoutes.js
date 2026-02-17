// src/routes/screeningRoutes.js

const express = require("express");
const { screenResume, getScreeningResults, getScreeningById } = require("../controllers/screeningController");
// const authMiddleware = require("../middleware/authMiddleware"); // Auth disabled for now

const router = express.Router();

// router.use(authMiddleware); // TODO: Re-enable auth later

router.post("/", screenResume);
router.get("/job/:jobId", getScreeningResults);
router.get("/:id", getScreeningById);

module.exports = router;
