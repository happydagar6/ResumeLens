const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    // Candidate & Job References (Populated for resume/interview actions, null for admin actions)
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
      required: false,
      default: null,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: false,
      default: null,
    },
    // Target user for administrative actions (e.g. role update, deactivation)
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
    // Multi-tenant organization scope
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: false,
      default: null,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        // Candidate Lifecycle Events
        "UPLOADED",
        "SCREENED",
        "DECISION_CHANGED",
        "EMAIL_GENERATED",
        "NOTE_ADDED",
        "EMAIL_SENT",
        "INTERVIEW_SCHEDULED",
        "INTERVIEW_RESCHEDULED",
        "INTERVIEW_CANCELLED",
        // Admin Organization Events
        "USER_ROLE_CHANGED",
        "USER_DEACTIVATED",
        "USER_REACTIVATED",
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
