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
// Returns all upcoming interviews across jobs assigned to the logged-in user
// ─────────────────────────────────────────────────────────────────────────────
async function getUpcomingInterviews(req, res, next) {
  try {
    // Default to an empty filter. If the user is an Admin, this stays empty ({})
    // so the query returns interviews across ALL jobs in the company.
    let jobFilter = {};

    // Check if user is NOT an admin (i.e. Recruiter or Hiring Manager)
    // Non-admins must only see interviews for jobs they own or are assigned to.
    if (req.user.role !== "admin") {
      // $or: Matches if AT LEAST ONE condition in the array is true:
      // 1) User created the job, OR 2) User is in the assignedTo list.
      // .select("_id"): Only retrieves the _id field to save memory.
      const accessibleJobs = await Job.find({
        $or: [{ createdBy: req.user.id }, { assignedTo: req.user.id }],
      }).select("_id");

      // accessibleJobs is an array of objects: [{ _id: "123" }, { _id: "456" }]
      // .map((j) => j._id): Extracts only the IDs into a flat array: ["123", "456"]
      const jobIds = accessibleJobs.map((j) => j._id);

      // $in: Matches any interview whose jobId is IN the jobIds list.
      jobFilter = { jobId: { $in: jobIds } };
    }

    // Fetch upcoming interviews:
    // ...jobFilter: Unpacks { jobId: { $in: jobIds } } for recruiters, or adds nothing ({}) for admins.
    // status $in: Only get active interviews ("scheduled" or "rescheduled"), not cancelled/completed.
    // $gte: (Greater Than or Equal to) filters out past interviews so only today or future meetings show.
    const upcomingInterviews = await Interview.find({
      ...jobFilter,
      status: { $in: ["scheduled", "rescheduled"] },
      scheduledAt: { $gte: new Date() },
    })
      .populate("resumeId", "candidateName candidateEmail")
      .populate("jobId", "title company")
      .populate("interviewer", "name email role")
      .sort({ scheduledAt: 1 }) // 1 = Ascending order (earliest upcoming interview first)
      .limit(50);

    return response(
      res,
      200,
      { interviews: upcomingInterviews },
      "Upcoming interviews retrieved",
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
