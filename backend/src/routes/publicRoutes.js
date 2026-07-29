// src/routes/publicRoutes.js
const express = require("express");
const Resume = require("../models/resumeModel");
const Screening = require("../models/screeningModel");

const router = express.Router();

// GET /api/public/status/:resumeId
// Public, unauthenticated endpoint for candidates to track their application
router.get("/status/:resumeId", async (req, res, next) => {
  try {
    const resume = await Resume.findById(req.params.resumeId)
      .populate("jobId", "title company")
      .select("candidateName status");

    if (!resume) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    // Check if screening exists
    const screening = await Screening.findOne({ resumeId: resume._id }).select("hiringManagerDecision");

    let friendlyStatus = "Application Received & Under Review";
    let activeStep = 1; // 1: Received, 2: Screened, 3: Decision

    if (screening) {
      activeStep = 2; // AI has processed it
      if (screening.hiringManagerDecision) {
        activeStep = 3;
        switch (screening.hiringManagerDecision) {
          case "shortlisted":
            friendlyStatus = "Shortlisted for Interview!";
            break;
          case "rejected":
            friendlyStatus = "Not Selected";
            break;
          case "on_hold":
            friendlyStatus = "Application Under Review";
            break;
          case "offered":
            friendlyStatus = "Offer Extended!";
            break;
        }
      }
    }

    // Only return safe, non-sensitive data
    res.status(200).json({
      success: true,
      data: {
        candidateName: resume.candidateName,
        jobTitle: resume.jobId?.title,
        company: resume.jobId?.company,
        friendlyStatus,
        activeStep,
      },
    });
  } catch (error) {
    // If it's a cast error (invalid ID format), return 404 instead of 500
    if (error.name === "CastError") {
      return res.status(404).json({ success: false, message: "Application not found" });
    }
    next(error);
  }
});

module.exports = router;
