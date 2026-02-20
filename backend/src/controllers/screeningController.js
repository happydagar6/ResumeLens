// src/controllers/screeningController.js

const Screening = require("../models/screeningModel");
const Resume = require("../models/resumeModel");
const Job = require("../models/jobModel");
const { scoreResume } = require("../services/resumeScorerAgent"); // CHANGED: was aiAgentService
const { response } = require("../utils/response");
const { CustomError } = require("../utils/errors");

async function screenResume(req, res, next) {
    try {
        const { resumeId } = req.body;
        if (!resumeId) throw new CustomError("resumeId is required", 400);

        const resume = await Resume.findById(resumeId);
        if (!resume) throw new CustomError("Resume not found", 404);
        if (!resume.parsedText) throw new CustomError("Resume has not been parsed yet", 400);

        const job = await Job.findById(resume.jobId);
        if (!job) throw new CustomError("Associated job not found", 404);

        // Ownership check: only the job creator or admin can screen its resumes
        if (req.user.role !== "admin" && job.createdBy?.toString() !== req.user.id) {
            throw new CustomError("Access denied", 403);
        }

        // Run AI scoring with extracted entities for better accuracy
        const aiResult = await scoreResume(
            resume.parsedText,
            job.description,
            resume.extractedEntities || {}, // Pass entities if available
            job.analyzedJD || null // Structured JD analysis
        );

        // aiResult fields now DIRECTLY match the Screening model — no manual mapping needed!
        const screening = new Screening({
            resumeId: resume._id,
            jobId: job._id,
            overallScore: aiResult.score,
            matchedSkills: aiResult.matchedSkills,
            missingSkills: aiResult.missingSkills,
            strengths: aiResult.strengths,
            weaknesses: aiResult.weaknesses,
            recommendation: aiResult.recommendation,
            rawAIResponse: aiResult,
        });
        await screening.save();

        // Update resume status
        resume.status = "screened";
        await resume.save();

        response(res, 201, { screening }, "Resume screened successfully");
    } catch (err) {
        next(err);
    }
}

// getRecommendation() REMOVED — the AI now returns the recommendation directly

async function getScreeningResults(req, res, next) {
    try {
        const { jobId } = req.params;

        // Verify the job exists; allow access to owner, admin, or assigned hiring manager
        const job = await Job.findById(jobId);
        if (!job) throw new CustomError("Job not found", 404);

        const isOwner = job.createdBy?.toString() === req.user.id;
        const isAssigned = job.assignedTo?.some((uid) => uid.toString() === req.user.id);
        if (req.user.role !== "admin" && !isOwner && !isAssigned) {
            throw new CustomError("Access denied", 403);
        }

        const screenings = await Screening.find({ jobId })
            .populate("resumeId", "candidateName candidateEmail fileName")
            .sort({ overallScore: -1 });
        response(res, 200, { screenings });
    } catch (err) {
        next(err);
    }
}

async function getScreeningById(req, res, next) {
    try {
        const screening = await Screening.findById(req.params.id)
            .populate("resumeId", "candidateName candidateEmail fileName parsedText")
            .populate("jobId", "title company description createdBy assignedTo")
            .populate("decidedBy", "name email");
        if (!screening) throw new CustomError("Screening result not found", 404);

        // Allow access to the job owner, admin, or any assigned hiring manager
        const job = screening.jobId;
        const isOwner = job?.createdBy?.toString() === req.user.id;
        const isAssigned = job?.assignedTo?.some((uid) => uid.toString() === req.user.id);
        if (req.user.role !== "admin" && !isOwner && !isAssigned) {
            throw new CustomError("Access denied", 403);
        }

        response(res, 200, { screening });
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/screening/:id/decision
// Body: { decision: string, notes?: string }
//
// Records the hiring manager's manual decision on a screened candidate.
// Allowed roles: hiring_manager (if assigned), recruiter (job owner), admin.
// ─────────────────────────────────────────────────────────────────────────────
async function makeDecision(req, res, next) {
    try {
        const { decision, notes = "" } = req.body;

        const validDecisions = ["shortlisted", "rejected", "on_hold", "offered"];
        if (!decision || !validDecisions.includes(decision)) {
            throw new CustomError(
                `decision must be one of: ${validDecisions.join(", ")}`,
                400
            );
        }

        // Load screening with job details for the access check
        const screening = await Screening.findById(req.params.id).populate(
            "jobId",
            "createdBy assignedTo"
        );
        if (!screening) throw new CustomError("Screening result not found", 404);

        const job = screening.jobId;
        const isOwner = job?.createdBy?.toString() === req.user.id;
        const isAssigned = job?.assignedTo?.some((uid) => uid.toString() === req.user.id);
        if (req.user.role !== "admin" && !isOwner && !isAssigned) {
            throw new CustomError("Access denied", 403);
        }

        screening.hiringManagerDecision = decision;
        screening.decidedBy = req.user.id;
        screening.decidedAt = new Date();
        screening.notes = notes;
        await screening.save();

        // Re-fetch with all populated fields for the response
        const updated = await Screening.findById(screening._id)
            .populate("resumeId", "candidateName candidateEmail fileName")
            .populate("jobId", "title company description createdBy assignedTo")
            .populate("decidedBy", "name email");

        response(res, 200, { screening: updated }, "Decision saved successfully");
    } catch (err) {
        next(err);
    }
}

module.exports = { screenResume, getScreeningResults, getScreeningById, makeDecision };
