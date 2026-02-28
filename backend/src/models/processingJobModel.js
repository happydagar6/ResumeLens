// src/models/processingJobModel.js
// Tracks background screening jobs — replaces Redis-backed BullMQ

const mongoose = require("mongoose");

const processingJobSchema = new mongoose.Schema(
    {
        // What type of job this is (for now only "screening", but extensible)
        type: {
            type: String,
            enum: ["screening"],
            required: true,
        },
        // Current state of the job
        status: {
            type: String,
            enum: ["queued", "processing", "completed", "failed"],
            default: "queued",
        },
        // The resume being processed (used as a reference key)
        resumeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Resume",
            required: true,
        },
        // The job posting (for cache invalidation + display)
        jobId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Job",
            required: true,
        },
        // Who initiated this processing job
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // Result data — populated when status becomes "completed"
        result: {
            screeningId: { type: mongoose.Schema.Types.ObjectId, ref: "Screening" },
            score: Number,
            recommendation: String,
            warnings: [String],
        },
        // Error message — populated when status becomes "failed"
        error: {
            type: String,
            default: null,
        },
        // Timestamps for tracking duration
        startedAt: { type: Date, default: null },
        completedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

// Index: quick lookup by resumeId (to check if a job is already queued/processing)
processingJobSchema.index({ resumeId: 1, status: 1 });

// Index: find all jobs for a specific job posting
processingJobSchema.index({ jobId: 1, createdAt: -1 });

module.exports = mongoose.model("ProcessingJob", processingJobSchema);