// src/controllers/resumeController.js

const Resume = require("../models/resumeModel");
const Job = require("../models/jobModel");
const { parsePDF } = require("../services/pdfParserService");
const { extractEntities } = require("../services/entityExtractorAgent"); // NEW
const { response } = require("../utils/response");
const { CustomError } = require("../utils/errors");

async function uploadResume(req, res, next) {
    try {
        if (!req.file) throw new CustomError("No file uploaded", 400);

        const { jobId, candidateName, candidateEmail } = req.body;
        if (!jobId || !candidateName) {
            throw new CustomError("jobId and candidateName are required", 400);
        }

        // Verify job exists
        const job = await Job.findById(jobId);
        if (!job) throw new CustomError("Job not found", 404);

        // Ownership check: only the job owner or admin can upload resumes to this job
        if (req.user.role !== "admin" && job.createdBy?.toString() !== req.user.id) {
            throw new CustomError("Access denied — you do not own this job", 403);
        }

        // Step 1: Parse PDF text
        let parsedText = "";
        try {
            parsedText = await parsePDF(req.file.path);
        } catch (parseErr) {
            console.error("PDF parse error:", parseErr.message);
        }

        // Step 2: Extract entities from parsed text (NEW)
        let extractedEntities = null;
        if (parsedText) {
            try {
                extractedEntities = await extractEntities(parsedText);
            } catch (extractErr) {
                // Don't fail the upload if entity extraction fails
                // The resume is still saved, just without entities
                console.error("Entity extraction error:", extractErr.message);
            }
        }

        // Step 3: Save resume to database
        const resume = new Resume({
            candidateName,
            candidateEmail: candidateEmail || "",
            fileName: req.file.originalname,
            filePath: req.file.path,
            parsedText,
            extractedEntities, // NEW: save extracted entities
            jobId,
            uploadedBy: req.user?.id || null,
            status: parsedText ? "parsed" : "uploaded",
        });
        await resume.save(); // save the resume to the database

        response(res, 201, { resume }, "Resume uploaded successfully");
    } catch (err) {
        next(err);
    }
}

// Get all resumes for a specific job
async function getResumesByJob(req, res, next) {
    try {
        const { jobId } = req.params;

        // Verify the job exists and the requester owns it (or is admin)
        const job = await Job.findById(jobId);
        if (!job) throw new CustomError("Job not found", 404);
        if (req.user.role !== "admin" && job.createdBy?.toString() !== req.user.id) {
            throw new CustomError("Access denied", 403);
        }

        const resumes = await Resume.find({ jobId }).sort({ createdAt: -1 });
        response(res, 200, { resumes });
    } catch (err) {
        next(err);
    }
}

// Get a single resume by ID
async function getResumeById(req, res, next) {
    try {
        const resume = await Resume.findById(req.params.id);
        if (!resume) throw new CustomError("Resume not found", 404);

        // Verify the parent job is accessible by this user
        const job = await Job.findById(resume.jobId);
        if (job && req.user.role !== "admin" && job.createdBy?.toString() !== req.user.id) {
            throw new CustomError("Access denied", 403);
        }

        response(res, 200, { resume });
    } catch (err) {
        next(err);
    }
}

// Delete a resume by ID
async function deleteResume(req, res, next) {
    try {
        const resume = await Resume.findById(req.params.id);
        if (!resume) throw new CustomError("Resume not found", 404);

        // Verify the parent job is accessible by this user
        const job = await Job.findById(resume.jobId);
        if (job && req.user.role !== "admin" && job.createdBy?.toString() !== req.user.id) {
            throw new CustomError("Access denied", 403);
        }

        await resume.deleteOne();
        response(res, 200, null, "Resume deleted successfully");
    } catch (err) {
        next(err);
    }
}

module.exports = { uploadResume, getResumesByJob, getResumeById, deleteResume };