// src/controllers/pipelineController.js
// Exposes two endpoints:
//   POST /api/pipeline/screen        → screen a single resume
//   POST /api/pipeline/batch-screen  → screen all unscreened resumes for a job

const Resume = require("../models/resumeModel");
const Job = require("../models/jobModel");
const { response } = require("../utils/response");
const { CustomError } = require("../utils/errors");

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/pipeline/screen
// Body: { resumeId: string }
// Runs the full LangGraph screening pipeline for a single resume.
// ─────────────────────────────────────────────────────────────────────────────

const { enqueueScreening, enqueueBatchScreening, cancelBatchScreening, getQueueStats } = require("../services/backgroundQueue");

async function screenSingle(req, res, next) {
    try {
        const { resumeId } = req.body;
        if (!resumeId) throw new CustomError("resumeId is required", 400);

        // Ownership check (same as before)
        const resume = await Resume.findById(resumeId).select("jobId");
        if (!resume) throw new CustomError("Resume not found", 404);
        const job = await Job.findById(resume.jobId).select("createdBy");
        if (!job) throw new CustomError("Associated job not found", 404);
        if (req.user.role !== "admin" && job.createdBy?.toString() !== req.user.id) {
            throw new CustomError("Access denied", 403);
        }

        // Enqueue — returns immediately with a ProcessingJob document
        const processingJob = await enqueueScreening({
            resumeId,
            jobId: resume.jobId,
            userId: req.user.id,
        });

        // HTTP 202 Accepted — "I received your request, it's being processed"
        res.status(202).json({
            success: true,
            message: processingJob.status === "queued"
                ? "Screening queued — processing will begin shortly"
                : "Screening already in progress",
            data: {
                processingJobId: processingJob._id,
                resumeId,
                status: processingJob.status,
            },
        });
    } catch (error) {
        next(error);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/pipeline/rescreen
// Body: { resumeId: string }
// Deletes existing screening + interview questions, resets resume status,
// then re-runs the full LangGraph pipeline.
// ─────────────────────────────────────────────────────────────────────────────
async function rescreenSingle(req, res, next) {
    try {
        const { resumeId } = req.body;
        if (!resumeId) throw new CustomError("resumeId is required", 400);

        // Ownership check
        const resume = await Resume.findById(resumeId).select("jobId status");
        if (!resume) throw new CustomError("Resume not found", 404);
        const job = await Job.findById(resume.jobId).select("createdBy");
        if (!job) throw new CustomError("Associated job not found", 404);
        if (req.user.role !== "admin" && job.createdBy?.toString() !== req.user.id) {
            throw new CustomError("Access denied", 403);
        }

        // Prevent re-screening if already in progress
        if (resume.status === "screening") {
            throw new CustomError("This resume is currently being screened", 409);
        }

        // Delete old screening + interview questions (clean slate)
        const Screening = require("../models/screeningModel");
        const InterviewQuestion = require("../models/interviewQuestionModel");

        const oldScreening = await Screening.findOne({ resumeId: resume._id });
        if (oldScreening) {
            await InterviewQuestion.deleteMany({ screeningId: oldScreening._id });
            await Screening.deleteOne({ _id: oldScreening._id });
            console.log(`[Pipeline] Deleted old screening ${oldScreening._id} + questions for re-screen`);
        }

        // Reset resume status so the pipeline can run fresh
        await Resume.findByIdAndUpdate(resumeId, {
            status: "parsed",
            screeningError: null,
        });

        // Enqueue via BullMQ (returns 202 immediately)
        const processingJob = await enqueueScreening({
            resumeId,
            jobId: resume.jobId,
            userId: req.user.id,
        });

        res.status(202).json({
            success: true,
            message: "Re-screening queued — processing will begin shortly",
            data: {
                processingJobId: processingJob._id,
                resumeId,
                status: processingJob.status,
            },
        });
    } catch (error) {
        next(error);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/pipeline/batch-screen
// Body: { jobId: string, concurrency?: number (default: 3) }
// Screens all resumes for a job that are NOT yet in "screened" status.
// Processes `concurrency` resumes at a time to avoid rate limits.
// ─────────────────────────────────────────────────────────────────────────────

async function screenBatch(req, res, next) {
    try {
        const { jobId } = req.body;
        if (!jobId) throw new CustomError("jobId is required", 400);

        const job = await Job.findById(jobId);
        if (!job) throw new CustomError("Job not found", 404);
        if (req.user.role !== "admin" && job.createdBy?.toString() !== req.user.id) {
            throw new CustomError("Access denied", 403);
        }

        const pendingResumes = await Resume.find({
            jobId,
            status: "parsed",
        }).select("_id");

        if (pendingResumes.length === 0) {
            return response(res, 200, { jobId, queued: 0 }, "No resumes need screening");
        }

        const resumeIds = pendingResumes.map((r) => r._id.toString());
        const jobs = await enqueueBatchScreening({
            resumeIds,
            jobId,
            userId: req.user.id,
        });

        res.status(202).json({
            success: true,
            message: `${jobs.length} resume(s) queued for screening`,
            data: {
                jobId,
                queued: jobs.length,
                processingJobs: jobs.map((j) => ({
                    processingJobId: j._id,
                    resumeId: j.resumeId,
                    status: j.status,
                })),
            },
        });
    } catch (error) {
        next(error);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/pipeline/status/:resumeId
// Returns the current screening status of a resume.
// Useful for polling from the frontend after triggering a pipeline.
// ─────────────────────────────────────────────────────────────────────────────
async function getPipelineStatus(req, res, next) {
    try {
        const resume = await Resume.findById(req.params.resumeId)
            .select("candidateName status screeningError jobId")
            .populate("jobId", "createdBy assignedTo organizationId");
        if (!resume) throw new CustomError("Resume not found", 404);

        // Security / IDOR Guard: Verify requester owns or is assigned to the parent job
        const job = resume.jobId;
        const isOwner = job?.createdBy?.toString() === req.user.id;
        const isAssigned = job?.assignedTo?.some((uid) => uid.toString() === req.user.id);
        const isOrgAdmin = req.user.role === "admin" && (
            !job?.organizationId || !req.user.organizationId ||
            job.organizationId.toString() === req.user.organizationId.toString()
        );

        if (!isOrgAdmin && !isOwner && !isAssigned) {
            throw new CustomError("Access denied", 403);
        }

        const Screening = require("../models/screeningModel");
        const ProcessingJob = require("../models/processingJobModel");

        const [screening, processingJob] = await Promise.all([
            Screening.findOne({ resumeId: resume._id }).select(
                "overallScore recommendation matchedSkills missingSkills createdAt"
            ),
            ProcessingJob.findOne({ resumeId: resume._id })
                .sort({ createdAt: -1 })
                .select("status startedAt completedAt error"),
        ]);

        response(res, 200, {
            resumeId: resume._id,
            candidateName: resume.candidateName,
            status: resume.status,          // "screening" | "screened" | "error"
            screeningError: resume.screeningError,
            screening: screening || null,
            processingJob: processingJob || null,  // NEW: queue status
        });
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/pipeline/cancel-batch
// Body: { jobId: string }
// Cancels all waiting BullMQ screening jobs for a job and resets resume statuses.
// ─────────────────────────────────────────────────────────────────────────────
async function cancelBatch(req, res, next) {
    try {
        const { jobId } = req.body;
        if (!jobId) throw new CustomError("jobId is required", 400);

        const job = await Job.findById(jobId);
        if (!job) throw new CustomError("Job not found", 404);
        if (req.user.role !== "admin" && job.createdBy?.toString() !== req.user.id) {
            throw new CustomError("Access denied", 403);
        }

        // Remove pending jobs from BullMQ Redis queue
        const { removedCount } = await cancelBatchScreening(jobId);

        // Reset unifinshed resume in mongodb back to "parsed" so they can be screened again later
        const resetResult = await Resume.updateMany(
            { jobId, status: "screening"},
            { status: "parsed" },
        );

        // Mark background job documents as "cancelled"
        const ProcessingJob = require("../models/processingJobModel");
        await ProcessingJob.updateMany(
            { jobId, status: { $in: ["queued", "processing"] } },
            { status: "cancelled", completedAt: new Date() }
        );

        // Send instant SSE update to the recruiter's UI
        const { broadcastToUser } = require("../services/sseService");
        broadcastToUser(req.user.id, "screening_cancelled", { jobId });
        
        return response(res, 200, {
            jobId,
            removedFromQueue: removedCount,
            resumesReset: resetResult.modifiedCount,
        }, "Screening cancelled successfully");
    } catch (error) {
        next(error);
    }
}

module.exports = { screenSingle, screenBatch, getPipelineStatus, rescreenSingle, cancelBatch };