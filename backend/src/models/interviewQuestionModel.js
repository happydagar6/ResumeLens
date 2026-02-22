// src/models/interviewQuestionModel.js

const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        enum: ["technical", "behavioral", "situational", "experience", "general"],
        default: "general",
    },
    difficulty: {
        type: String,
        enum: ["easy", "medium", "hard"],
        default: "medium",
    },
    // Tracks whether this question was actually asked in the interview
    usedInInterview: {
        type: Boolean,
        default: false,
    },
});

const interviewQuestionSchema = new mongoose.Schema(
    {
        screeningId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Screening",
            required: true,
        },
        resumeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Resume",
            required: true,
        },
        jobId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Job",
            required: true,
        },
        questions: {
            type: [questionSchema],
            default: [],
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("InterviewQuestion", interviewQuestionSchema);
