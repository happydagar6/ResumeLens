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

    scoringWeights: {
      technical: { type: Number, default: 40 },
      experience: { type: Number, default: 40 },
      culture: { type: Number, default: 20 },
    },

    analyzedJD: {
      type: mongoose.Schema.Types.Mixed, // Stores any JSON object
      default: null,
    },
    biasFlags: {
      type: mongoose.Schema.Types.Mixed, // e.g. { genderBias: true, ageBias: false }
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
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },
  },
  { timestamps: true },
);

jobSchema.index({ createdBy: 1, status: 1 }); // For efficient querying of a user's jobs by status
jobSchema.index({ createdBy: 1, createdAt: -1 }); // For sorting a user's jobs by creation date
jobSchema.index({ assignedTo: 1 }); // For finding jobs assigned to a specific user
jobSchema.index({ title: "text", description: "text" }); // For text search on job title and description

module.exports = mongoose.model("Job", jobSchema);
