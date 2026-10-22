// src/controllers/interviewController.js

const Interview = require("../models/interviewModel");
const Resume = require("../models/resumeModel");
const Job = require("../models/jobModel");
const Screening = require("../models/screeningModel");
const sendEmail = require("../services/emailService");
const { createAuditLog } = require("../utils/auditLogModel");
const { response } = require("../utils/response");
const { CustomError } = require("../utils/errors");

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/interviews
// Schedules a new interview round for a candidate
// ─────────────────────────────────────────────────────────────────────────────
async function scheduleInterview(req, res, next) {
  try {
    const {
      resumeId,
      title,
      roundType,
      scheduledAt,
      duration,
      interviewer,
      meetingType,
      meetingLink,
      notes,
    } = req.body;

    // 1. Input Validation
    if (!resumeId || !scheduledAt || !interviewer) {
      throw new CustomError(
        "resumeId, scheduledAt, and interviewer are required",
        400,
      );
    }

    // 2. Fetch candidate resume
    const resume = await Resume.findById(resumeId);
    if (!resume) {
      throw new CustomError("Candidate resume not found", 404);
    }

    // 3. Fetch associated job & verify recruiter authorization
    const job = await Job.findById(resume.jobId);
    if (!job) {
      throw new CustomError("Associated job requisition not found", 404);
    }

    const isAuthorized =
      req.user.role === "admin" ||
      job.createdBy?.toString() === req.user.id ||
      job.assignedTo?.some((id) => id.toString() === req.user.id);

    if (!isAuthorized) {
      throw new CustomError(
        "You do not have permission to schedule interviews for this job",
        403,
      );
    }

    // 4. Create the Interview document in MongoDB
    const interview = await Interview.create({
      resumeId,
      jobId: job._id,
      title: title || "Technical Interview",
      roundType: roundType || "technical",
      scheduledAt: new Date(scheduledAt),
      duration: duration || 45,
      interviewer,
      meetingType: meetingType || "google_meet",
      meetingLink: meetingLink || "",
      notes: notes || "",
      status: "scheduled",
      createdBy: req.user.id,
    });

    // Populate interviewer details before sending response
    await interview.populate("interviewer", "name email role");

    // // 5. Automated Side-Effect A: Advance candidate stage to "shortlisted" for interview
    await Screening.findOneAndUpdate(
      { resumeId: resume._id },
      {
        hiringManagerDecision: "shortlisted",
        decidedBy: req.user.id,
        decidedAt: new Date(),
      },
    );

    // 6. Automated Side-Effect B: Log activity in candidate AuditLog timeline
    await createAuditLog({
      resumeId: resume._id,
      jobId: job._id,
      action: "INTERVIEW_SCHEDULED",
      performedBy: req.user.id,
      metadata: {
        interviewId: interview._id,
        title: interview.title,
        roundType: interview.roundType,
        scheduledAt: interview.scheduledAt,
        duration: interview.duration,
        meetingLink: interview.meetingLink,
      },
    });

    // 7. Automated Side-Effect C: Dispatch email invitation to candidate via Resend
    if (resume.candidateEmail) {
      try {
        const interviewDateFormatted = new Date(scheduledAt).toLocaleString(
          "en-US",
          {
            dateStyle: "full",
            timeStyle: "short",
          },
        );

        await sendEmail({
          email: resume.candidateEmail,
          subject: `Interview Invitation: ${interview.title} for ${job.title} at ${job.company}`,
          body: `Hi ${resume.candidateName},\n\nYou have been invited to an interview for the ${job.title} role at ${job.company}.\n\nRound: ${interview.title}\nDate & Time: ${interviewDateFormatted}\nDuration: ${interview.duration} minutes\nMeeting Link: ${interview.meetingLink || "Your interviewer will share the link shortly"}\n\nBest regards,\nHiring Team at ${job.company}`,
        });
      } catch (emailErr) {
        // Do not crash the API request if the email fails (e.g. invalid test email)
        console.error(
          "[InterviewController] Email dispatch warning:",
          emailErr.message,
        );
      }
    }

    // 8. Return response
    return response(
      res,
      201,
      { interview },
      "Interview scheduled successfully",
    );
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/interviews/candidate/:resumeId
// Returns all interview rounds for a specific candidate
// ─────────────────────────────────────────────────────────────────────────────
async function getCandidateInterviews(req, res, next) {
  try {
    const { resumeId } = req.params;
    if (!resumeId) {
      throw new CustomError("Candidate resumeId is required", 400);
    }

    const resume = await Resume.findById(resumeId).select("jobId");
    if (!resume) {
      throw new CustomError("Candidate not found", 404);
    }

    // Verify user authorization for this job
    const job = await Job.findById(resume.jobId).select("createdBy assignedTo");
    if (!job) {
      throw new CustomError("Associated job not found", 404);
    }

    const isAuthorized =
      req.user.role === "admin" ||
      job.createdBy?.toString() === req.user.id ||
      job.assignedTo?.some((id) => id.toString() === req.user.id);

    if (!isAuthorized) {
      throw new CustomError("Access denied", 403);
    }

    // Fetch all interview rounds sorted with newest/upcoming first
    const interviews = await Interview.find({ resumeId })
      .populate("interviewer", "name email role")
      .populate("createdBy", "name email")
      .sort({ scheduledAt: -1 });

    return response(
      res,
      200,
      { interviews },
      "Candidate interviews retrieved successfully",
    );
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/interviews/:id
// Reschedules an interview or updates its details / status
// ─────────────────────────────────────────────────────────────────────────────
async function updateInterview(req, res, next) {
  try {
    const { id } = req.params;
    const {
      title,
      roundType,
      scheduledAt,
      duration,
      interviewer,
      meetingType,
      meetingLink,
      notes,
      status,
    } = req.body;

    const interview = await Interview.findById(id);
    if (!interview) {
      throw new CustomError("Interview round not found", 404);
    }

    // Verify recruiter authorization for this job
    const job = await Job.findById(interview.jobId).select(
      "createdBy assignedTo",
    );
    if (!job) {
      throw new CustomError("Associated job not found", 404);
    }

    const isAuthorized =
      req.user.role === "admin" ||
      job.createdBy?.toString() === req.user.id ||
      job.assignedTo?.some((id) => id.toString() === req.user.id);

    if (!isAuthorized) {
      throw new CustomError("Access denied", 403);
    }

    // Check if the scheduled time changed (Rescheduling detection)
    const isRescheduled =
      scheduledAt &&
      new Date(scheduledAt).getTime() !==
        new Date(interview.scheduledAt).getTime();

    // Update fields
    if (title) interview.title = title;
    if (roundType) interview.roundType = roundType;
    if (scheduledAt) interview.scheduledAt = new Date(scheduledAt);
    if (duration) interview.duration = duration;
    if (interviewer) interview.interviewer = interviewer;
    if (meetingType) interview.meetingType = meetingType;
    if (meetingLink !== undefined) interview.meetingLink = meetingLink;
    if (notes !== undefined) interview.notes = notes;
    if (status) interview.status = status;
    if (isRescheduled && interview.status === "scheduled") {
      interview.status = "rescheduled";
    }

    await interview.save();
    await interview.populate("interviewer", "name email role");

    // Side-Effect: Log audit entry if rescheduled
    if (isRescheduled) {
      await createAuditLog({
        resumeId: interview.resumeId,
        jobId: interview.jobId,
        action: "INTERVIEW_RESCHEDULED",
        performedBy: req.user.id,
        metadata: {
          interviewId: interview._id,
          newDate: interview.scheduledAt,
          meetingLink: interview.meetingLink,
        },
      });
    }

    return response(res, 200, { interview }, "Interview updated successfully");
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/interviews/:id
// Cancels an interview round (Soft cancellation with reason)
// ─────────────────────────────────────────────────────────────────────────────
async function cancelInterview(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const interview = await Interview.findById(id);
    if (!interview) {
      throw new CustomError("Interview not found", 404);
    }

    // Verify recruiter authorization
    const job = await Job.findById(interview.jobId).select(
      "createdBy assignedTo",
    );
    if (!job) {
      throw new CustomError("Associated job not found", 404);
    }

    const isAuthorized =
      req.user.role === "admin" ||
      job.createdBy?.toString() === req.user.id ||
      job.assignedTo?.some((id) => id.toString() === req.user.id);

    if (!isAuthorized) {
      throw new CustomError("Access denied", 403);
    }

    // Soft cancel: update status and save reason
    interview.status = "cancelled";
    interview.cancellationReason = reason || "Cancelled by recruiter";
    await interview.save();

    // Log cancellation in AuditLog timeline
    await createAuditLog({
      resumeId: interview.resumeId,
      jobId: interview.jobId,
      action: "INTERVIEW_CANCELLED",
      performedBy: req.user.id,
      metadata: {
        interviewId: interview._id,
        title: interview.title,
        reason: interview.cancellationReason,
      },
    });

    return response(
      res,
      200,
      { interview },
      "Interview cancelled successfully",
    );
  } catch (error) {
    next(error);
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/interviews
// Returns interviews across jobs assigned to the logged-in user.
// Supports query params:
//   - timeframe: "all" (default for hub) | "upcoming" (today onwards) | "past"
//   - status: "scheduled" | "completed" | "cancelled" | "all"
// ─────────────────────────────────────────────────────────────────────────────
async function getUpcomingInterviews(req, res, next) {
  try {
    const { timeframe = "all", status } = req.query;

    // 1. Role-Based Scoping:
    // Admin sees all jobs; Recruiters and Hiring Managers see only their accessible jobs
    let jobFilter = {};

    if (req.user.role !== "admin") {
      const accessibleJobs = await Job.find({
        $or: [{ createdBy: req.user.id }, { assignedTo: req.user.id }],
      }).select("_id");

      const jobIds = accessibleJobs.map((j) => j._id);
      jobFilter = { jobId: { $in: jobIds } };
    }

    // 2. Build the MongoDB Filter Query
    const query = { ...jobFilter };

    // Calculate midnight of the current day in local server time
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Apply timeframe filtering if requested
    if (timeframe === "upcoming") {
      query.scheduledAt = { $gte: startOfToday };
      if (!status) {
        query.status = { $in: ["scheduled", "rescheduled"] };
      }
    } else if (timeframe === "past") {
      query.$or = [
        { scheduledAt: { $lt: startOfToday } },
        { status: "completed" },
      ];
    } else if (timeframe === "today") {
      query.scheduledAt = { $gte: startOfToday, $lte: endOfToday };
    }
    // Note: If timeframe === "all", we don't constrain scheduledAt, returning all records for the hub.

    // Apply explicit status filter if supplied and not "all"
    if (status && status !== "all") {
      query.status = status;
    }

    // 3. Query Database with Populated Relations
    const interviews = await Interview.find(query)
      .populate("resumeId", "candidateName candidateEmail currentStage status")
      .populate("jobId", "title company department location")
      .populate("interviewer", "name email role")
      .populate("createdBy", "name email")
      .sort({ scheduledAt: -1 })
      .limit(100);

    return response(
      res,
      200,
      { interviews, total: interviews.length },
      "Interviews retrieved successfully",
    );
  } catch (error) {
    next(error);
  }
}


module.exports = {
  scheduleInterview,
  getCandidateInterviews,
  updateInterview,
  cancelInterview,
  getUpcomingInterviews,
};
