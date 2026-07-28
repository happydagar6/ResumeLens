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
    
    // NEW: Store the granular breakdown and the AI's 1-sentence reasoning per category
    scoreBreakdown: {
      technical: { score: Number, rationale: String },
      experience: { score: Number, rationale: String },
      culture: { score: Number, rationale: String },
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
    validationFlags: {
      type: [String],
      default: [],
    },
    // ── Hiring Manager Decision Layer ─────────────────────────────────────
    // The AI gives a recommendation; the hiring manager makes the final call.
    hiringManagerDecision: {
      type: String,
      enum: ["shortlisted", "rejected", "on_hold", "offered", null],
      default: null,
    },
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    decidedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

// Unique: one screening per resume
screeningSchema.index({ resumeId: 1 }, { unique: true }); // Ensure one screening per resume

// fast lookup of all candidates for a job, sorted by score
screeningSchema.index({ jobId: 1, overallScore: -1 });
module.exports = mongoose.model("Screening", screeningSchema);
