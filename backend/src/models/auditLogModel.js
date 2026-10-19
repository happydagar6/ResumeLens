const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
      required: true,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "UPLOADED",
        "SCREENED",
        "DECISION_CHANGED",
        "EMAIL_GENERATED",
        "NOTE_ADDED",
        "EMAIL_SENT",
        "INTERVIEW_SCHEDULED",
        "INTERVIEW_RESCHEDULED",
        "INTERVIEW_CANCELLED",
      ],
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      // Can be null if performed by the background "System" (e.g. AI Screening)
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("AuditLog", auditLogSchema);
