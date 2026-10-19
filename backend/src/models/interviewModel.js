// src/models/interviewModel.js

const mongoose = require("mongoose");

const interviewSchema = new mongoose.Schema(
  {
    // Candidate reference
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
      required: [true, "Candidate resume ID is required"],
      index: true,
    },

    // Associated job requisition reference
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: [true, "Associated job ID is required"],
      index: true,
    },

    // Human-readable title of the interview round (e.g., "Round 1: System Design")
    title: {
      type: String,
      required: [true, "Interview title is required"],
      trim: true,
      default: "Technical Interview",
    },

    // Standardized round category
    roundType: {
      type: String,
      enum: [
        "screening",
        "technical",
        "system_design",
        "behavioral",
        "hiring_manager",
        "culture_fit",
        "final",
      ],
      default: "technical",
    },

    // Exact scheduled date and time
    scheduledAt: {
      type: Date,
      required: [true, "Scheduled date and time is required"],
    },

    // Expected duration in minutes
    duration: {
      type: Number,
      required: [true, "Interview duration in minutes is required"],
      default: 45,
      min: [15, "Duration must be at least 15 minutes"],
      max: [240, "Duration cannot exceed 240 minutes (4 hours)"],
    },

    // Team member assigned to conduct the interview
    interviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Interviewer is required"],
    },

    // Meeting platform
    meetingType: {
      type: String,
      enum: ["google_meet", "zoom", "teams", "in_person", "phone"],
      default: "google_meet",
    },

    // Join URL or physical meeting location
    meetingLink: {
      type: String,
      trim: true,
      default: "",
    },

    // Lifecycle status of this interview round
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled", "rescheduled"],
      default: "scheduled",
      index: true,
    },

    // Internal interviewer instructions / preparation notes (strictly hidden from candidate)
    notes: {
      type: String,
      trim: true,
      default: "",
    },

    // Reason provided if the interview round is cancelled
    cancellationReason: {
      type: String,
      trim: true,
      default: null,
    },

    // Recruiter or Admin who scheduled this round
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Compound indexes for sub-10ms query performance
interviewSchema.index({ resumeId: 1, scheduledAt: -1 });
interviewSchema.index({ jobId: 1, scheduledAt: -1 });
interviewSchema.index({ interviewer: 1, scheduledAt: 1 });

module.exports = mongoose.model("Interview", interviewSchema);