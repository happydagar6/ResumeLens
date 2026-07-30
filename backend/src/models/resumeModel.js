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
    isPastApplicant: {
      type: Boolean,
      default: false,
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
    // NEW: Store structured data extracted by AI from the resume
    extractedEntities: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
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
      enum: ["uploaded", "parsed", "screening", "screened", "error"],
      default: "uploaded",
    },
    // Stores error message if pipeline failed
    screeningError: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

resumeSchema.index({ jobId: 1, status: 1 }); // For efficient retrieval of resumes for a job
resumeSchema.index({ jobId: 1, createdAt: -1 }); // For sorting resumes by upload date within a job
resumeSchema.index({ candidateEmail: 1 }); // For duplicate detection queries

module.exports = mongoose.model("Resume", resumeSchema);
