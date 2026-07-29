const AuditLog = require("../models/auditLogModel");

/**
 * Creates an audit log entry for a candidate's timeline.
 * @param {Object} params
 * @param {string} params.resumeId
 * @param {string} params.jobId
 * @param {string} params.action - e.g. "UPLOADED", "SCREENED", "DECISION_CHANGED"
 * @param {string|null} params.performedBy - User ID (null for system actions)
 * @param {Object} params.metadata - Extra context (e.g., { newDecision: "shortlisted" })
 */
async function createAuditLog({ resumeId, jobId, action, performedBy = null, metadata = {} }) {
  try {
    await AuditLog.create({
      resumeId,
      jobId,
      action,
      performedBy,
      metadata,
    });
  } catch (error) {
    // We log the error but don't crash the main process if an audit log fails to save
    console.error("[AuditLogger] Failed to save log:", error.message);
  }
}

module.exports = { createAuditLog };
