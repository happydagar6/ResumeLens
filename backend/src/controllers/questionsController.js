// src/controllers/questionsController.js

const InterviewQuestion = require("../models/interviewQuestionModel");
const Screening = require("../models/screeningModel");
const Resume = require("../models/resumeModel");
const Job = require("../models/jobModel");
const { openai } = require("../config/ai");
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

        // Generate questions via AI
        const prompt = `Based on the following resume and job description, generate 5-10 personalized interview questions.

Resume Text:
${resume.parsedText}

Job Description:
${job.description}

Screening Score: ${screening.overallScore}%
Matched Skills: ${screening.matchedSkills.join(", ")}
Missing Skills: ${screening.missingSkills.join(", ")}

Return a JSON array of objects with fields: question, category (technical/behavioral/situational/experience/general), difficulty (easy/medium/hard).`;

        const aiResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.4,
            response_format: { type: "json_object" },
        });

        let questions = [];
        try {
            const parsed = JSON.parse(aiResponse.choices[0].message.content);
            questions = parsed.questions || parsed;
        } catch (parseErr) {
            throw new CustomError("Failed to parse AI response", 500);
        }

        const interviewQuestion = new InterviewQuestion({
            screeningId: screening._id,
            resumeId: resume._id,
            jobId: job._id,
            questions,
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
