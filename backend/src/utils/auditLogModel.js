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
// We use async/await syntax for consistency with other parts of the application.
// The function is wrapped in a try...catch block to handle potential errors during database operations.
async function createAuditLog({ resumeId, jobId, action, performedBy = null, metadata = {} }) {
  try {
    await AuditLog.create({ // 2- attempt retry logic: wrap the create call in a try...catch block to handle potential errors
      resumeId,
      jobId,
      action,
      performedBy,
      metadata,
    }); // end of create
  } catch (error) {
    // We log the error but don't crash the main process if an audit log fails to save
    console.error("[AuditLogger] Failed to save log:", error.message); // end of catch
  }
} // end of createAuditLog

module.exports = { createAuditLog }; // end of module export