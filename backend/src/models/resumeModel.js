// src/models/resumeModel.js

const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema(
    {
        candidateName: {
            type: String,
            required: [true, "Candidate name is required"],
            trim: true,
        },
        candidateEmail: {
            type: String,
            trim: true,
            lowercase: true,
            default: "",
        },
        fileName: {
            type: String,
            required: true,
        },
        filePath: {
            type: String,
            required: true,
        },
        parsedText: {
            type: String,
            default: "",
        },
        jobId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Job",
            required: true,
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        status: {
            type: String,
            enum: ["uploaded", "parsed", "screened", "error"],
            default: "uploaded",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Resume", resumeSchema);