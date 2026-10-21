// src/routes/publicRoutes.js
// src/routes/publicRoutes.js
const express = require("express");
const Job = require("../models/jobModel");                   // To query job details
const Resume = require("../models/resumeModel");             // To save candidate application
const Screening = require("../models/screeningModel");
const Interview = require("../models/interviewModel");
const upload = require("../config/multer");                 // Multer memory storage (req.file.buffer)
const { parsePDF } = require("../services/pdfParserService"); // In-memory PDF text extraction
const { extractEntities } = require("../services/entityExtractorAgent"); // AI skill/experience extraction
const { cloudinary } = require("../config/cloudinary");      // Permanent cloud storage
const streamifier = require("streamifier");                 // Converts buffer into readable stream
const { enqueueScreening } = require("../services/backgroundQueue"); // BullMQ queue trigger
const { CustomError } = require("../utils/errors");
const { publicApplyLimiter, publicReadLimiter } = require("../middleware/rateLimiter");


const router = express.Router();

// GET /api/public/status/:resumeId
// Public, unauthenticated endpoint for candidates to track their application
router.get("/status/:resumeId", publicReadLimiter, async (req, res, next) => {
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

    // Fetch upcoming scheduled interview (strictly safe public fields only: no internal notes)
    const upcomingInterview = await Interview.findOne({
      resumeId: resume._id,
      status: { $in: ["scheduled", "rescheduled"] },
    })
      .select("title scheduledAt duration meetingLink meetingType")
      .sort({ scheduledAt: 1 });

    // Only return safe, non-sensitive data
    res.status(200).json({
      success: true,
      data: {
        candidateName: resume.candidateName,
        jobTitle: resume.jobId?.title,
        company: resume.jobId?.company,
        friendlyStatus: upcomingInterview ? "Interview Scheduled!" : friendlyStatus,
        activeStep,
        upcomingInterview: upcomingInterview || null,
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

// GET /api/public/jobs/:jobId
// Fetches clean, public details about an open job for candidates to read
router.get("/jobs/:jobId", publicReadLimiter, async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.jobId)
      // Only select public-safe fields (Do NOT expose internal notes or user IDs)
      .select("title company description requirements skills location type salaryRange status createdAt");

      // If there is no job with that id, return 404
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    // Business check: If job was closed or is still a draft, candidates cannot apply
    if (job.status !== "open") {
      return res.status(400).json({ 
        success: false, 
        message: "This position is no longer accepting applications." 
      });
    }

    res.status(200).json({ success: true, data: { job } });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({ success: false, message: "Invalid job ID" });
    }
    next(error);
  }
});


// POST /api/public/apply/:jobId
// Public candidate application submission
router.post("/apply/:jobId", publicApplyLimiter, upload.single("resume"), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new CustomError("Please upload your resume in PDF format.", 400);
    }

    const { candidateName, candidateEmail, candidatePhone } = req.body;
    if (!candidateName || !candidateEmail) {
      throw new CustomError("Name and email are required.", 400);
    }

    // 1. Verify Job exists and is accepting applications
    const job = await Job.findById(req.params.jobId);
    if (!job || job.status !== "open") {
      throw new CustomError("This position is no longer accepting applications.", 400);
    }

    // 2. Parse PDF in RAM
    let parsedText = "";
    try {
      parsedText = await parsePDF(req.file.buffer);
    } catch (parseErr) {
      console.error("PDF parse error:", parseErr.message);
    }

    // 3. Extract entities
    let extractedEntities = null;
    if (parsedText) {
      try {
        extractedEntities = await extractEntities(parsedText);
      } catch (err) {
        console.error("Entity extraction failed:", err.message);
      }
    }

    // 4. Duplicate Candidate Check
    const normalizedEmail = candidateEmail.trim().toLowerCase();
    const existingResumes = await Resume.find({ candidateEmail: normalizedEmail });

    let isPastApplicant = false;
    if (existingResumes.length > 0) {
      const alreadyApplied = existingResumes.some(
        (r) => r.jobId.toString() === job._id.toString()
      );
      if (alreadyApplied) {
        throw new CustomError(
          `You have already submitted an application for this position with email ${normalizedEmail}.`,
          409
        );
      }
      isPastApplicant = true;
    }

    // 5. Stream directly to Cloudinary
    const uploadToCloudinary = new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "recruitai_resumes",
          resource_type: "raw",
          format: "pdf",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    const cloudData = await uploadToCloudinary;

    // 6. Save Resume to MongoDB
    const resume = new Resume({
      candidateName: candidateName.trim(),
      candidateEmail: normalizedEmail,
      candidatePhone: candidatePhone?.trim() || "",
      isPastApplicant,
      fileName: req.file.originalname,
      filePath: cloudData.secure_url,
      parsedText,
      extractedEntities,
      jobId: job._id,
      uploadedBy: null, // Public application
      status: parsedText ? "parsed" : "uploaded",
    });
    await resume.save();

    // 7. Enqueue background AI screening in BullMQ automatically!
    if (job.createdBy) {
      try {
        await enqueueScreening({
          resumeId: resume._id,
          jobId: job._id,
          userId: job.createdBy, // Sends real-time SSE update to the recruiter!
        });
      } catch (queueErr) {
        console.error("Background queue error:", queueErr.message);
      }
    }

    // 8. Return response with resumeId for live tracking
    res.status(201).json({
      success: true,
      message: "Application submitted successfully!",
      data: { resumeId: resume._id },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
