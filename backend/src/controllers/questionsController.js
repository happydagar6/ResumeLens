// src/controllers/questionsController.js

const InterviewQuestion = require("../models/interviewQuestionModel");
const Screening = require("../models/screeningModel");
const Resume = require("../models/resumeModel");
const Job = require("../models/jobModel");
const { generateInterViewQuestions } = require("../services/questionGeneratorAgent"); // CHANGED: was inline openai
const { response } = require("../utils/response");
const { CustomError } = require("../utils/errors");

async function generateQuestions(req, res, next) {
    try {
        const { screeningId } = req.body;
        if (!screeningId) throw new CustomError("screeningId is required", 400);

        const screening = await Screening.findById(screeningId);
        if (!screening) throw new CustomError("Screening result not found", 404);

        const resume = await Resume.findById(screening.resumeId);
        const job = await Job.findById(screening.jobId);
        if (!resume || !job) throw new CustomError("Associated resume or job not found", 404);

        // Generate questions via dedicated service (REPLACED 15 lines of inline code)
        const aiResult = await generateInterViewQuestions(
            resume.parsedText,
            job.description,
            screening // Pass the whole screening object — service reads .overallScore, .matchedSkills, etc.
        );

        const interviewQuestion = new InterviewQuestion({
            screeningId: screening._id,
            resumeId: resume._id,
            jobId: job._id,
            questions: aiResult.questions, // Validated array from the service
        });
        await interviewQuestion.save();

        response(res, 201, { interviewQuestion }, "Interview questions generated successfully");
    } catch (err) {
        next(err);
    }
}

async function getQuestionsByScreening(req, res, next) {
    try {
        const { screeningId } = req.params;
        const questions = await InterviewQuestion.findOne({ screeningId })
            .populate("resumeId", "candidateName candidateEmail")
            .populate("jobId", "title company");
        if (!questions) throw new CustomError("No questions found for this screening", 404);
        response(res, 200, { questions });
    } catch (err) {
        next(err);
    }
}

module.exports = { generateQuestions, getQuestionsByScreening };
