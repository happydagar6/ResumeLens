// src/models/screeningModel.js

const mongoose = require("mongoose");

const screeningSchema = new mongoose.Schema(
    {
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
        overallScore: {
            type: Number,
            min: 0,
            max: 100,
            default: 0,
        },
        matchedSkills: {
            type: [String],
            default: [],
        },
        missingSkills: {
            type: [String],
            default: [],
        },
        strengths: {
            type: String,
            default: "",
        },
        weaknesses: {
            type: String,
            default: "",
        },
        recommendation: {
            type: String,
            enum: ["strong_yes", "yes", "maybe", "no", "strong_no"],
            default: "maybe",
        },
        rawAIResponse: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Screening", screeningSchema);
