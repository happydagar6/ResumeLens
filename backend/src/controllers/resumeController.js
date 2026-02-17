// src/controllers/resumeController.js

const Resume = require("../models/resumeModel");
const Job = require("../models/jobModel");
const { parsePDF } = require("../services/pdfParserService");
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

        // Parse PDF text
        let parsedText = "";
        try {
            parsedText = await parsePDF(req.file.path);
        } catch (parseErr) {
            console.error("PDF parse error:", parseErr.message);
        }

        const resume = new Resume({
            candidateName,
            candidateEmail: candidateEmail || "",
            fileName: req.file.originalname,
            filePath: req.file.path,
            parsedText,
            jobId,
            uploadedBy: req.user?.id || null,
            status: parsedText ? "parsed" : "uploaded",
        });
        await resume.save();

        response(res, 201, { resume }, "Resume uploaded successfully");
    } catch (err) {
        next(err);
    }
}

async function getResumesByJob(req, res, next) {
    try {
        const { jobId } = req.params;
        const resumes = await Resume.find({ jobId }).sort({ createdAt: -1 });
        response(res, 200, { resumes });
    } catch (err) {
        next(err);
    }
}

async function getResumeById(req, res, next) {
    try {
        const resume = await Resume.findById(req.params.id);
        if (!resume) throw new CustomError("Resume not found", 404);
        response(res, 200, { resume });
    } catch (err) {
        next(err);
    }
}

async function deleteResume(req, res, next) {
    try {
        const resume = await Resume.findByIdAndDelete(req.params.id);
        if (!resume) throw new CustomError("Resume not found", 404);
        response(res, 200, null, "Resume deleted successfully");
    } catch (err) {
        next(err);
    }
}

module.exports = { uploadResume, getResumesByJob, getResumeById, deleteResume };
