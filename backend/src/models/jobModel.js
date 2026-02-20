// src/models/jobModel.js

const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Job title is required"],
            trim: true,
        },
        company: {
            type: String,
            required: [true, "Company name is required"],
            trim: true,
        },
        description: {
            type: String,
            required: [true, "Job description is required"],
        },
        requirements: {
            type: String,
            default: "",
        },
        skills: {
            type: [String],
            default: [],
        },
        location: {
            type: String,
            trim: true,
            default: "",
        },
        type: {
            type: String,
            enum: ["full-time", "part-time", "contract", "internship", "remote"],
            default: "full-time",
        },
        salaryRange: {
            type: String,
            default: "",
        },
        status: {
            type: String,
            enum: ["open", "closed", "draft"],
            default: "open",
        },
        analyzedJD: {
            type: mongoose.Schema.Types.Mixed,  // Stores any JSON object
            default: null,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        // Array of User IDs — hiring managers assigned to review this job's candidates
        assignedTo: {
            type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
            default: [],
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Job", jobSchema);
