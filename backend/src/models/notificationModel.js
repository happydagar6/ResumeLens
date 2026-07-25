// src/models/notificationModel.js

const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["screening_complete", "decision_made", "resume_uploaded", "general"],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    detail: {
      type: String,
      default: "",
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      default: null,
    },
    screeningId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Screening",
      default: null,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Composite index for fast unread-first queries per user
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

// TTL index to automatically delete notifications after 7 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

module.exports = mongoose.model("Notification", notificationSchema);
