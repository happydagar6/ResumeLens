// src/controllers/screeningController.js

const Screening = require("../models/screeningModel");
const Resume = require("../models/resumeModel");
const Job = require("../models/jobModel");
const { analyzeResume } = require("../services/aiAgentService");
const { response } = require("../utils/response");
const { CustomError } = require("../utils/errors");

async function screenResume(req, res, next) {
    try {
        const { resumeId } = req.body;
        if (!resumeId) throw new CustomError("resumeId is required", 400);

        const resume = await Resume.findOne({ _id: resumeId, uploadedBy: req.user.id });
        if (!resume) throw new CustomError("Resume not found", 404);
        if (!resume.parsedText) throw new CustomError("Resume has not been parsed yet", 400);

        const job = await Job.findById(resume.jobId);
        if (!job) throw new CustomError("Associated job not found", 404);

        // Run AI analysis
        const aiResult = await analyzeResume(resume.parsedText, job.description);

        const screening = new Screening({
            resumeId: resume._id,
            jobId: job._id,
            overallScore: aiResult.score || 0,
            matchedSkills: aiResult.strengths ? [aiResult.strengths] : [],
            missingSkills: aiResult.missingKeywords || [],
            strengths: aiResult.strengths || "",
            weaknesses: aiResult.weaknesses || "",
            recommendation: getRecommendation(aiResult.score || 0),
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

function getRecommendation(score) {
    if (score >= 85) return "strong_yes";
    if (score >= 70) return "yes";
    if (score >= 50) return "maybe";
    if (score >= 30) return "no";
    return "strong_no";
}

async function getScreeningResults(req, res, next) {
    try {
        const { jobId } = req.params;
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
            .populate("jobId", "title company description");
        if (!screening) throw new CustomError("Screening result not found", 404);
        response(res, 200, { screening });
    } catch (err) {
        next(err);
    }
}

module.exports = { screenResume, getScreeningResults, getScreeningById };
