// src/controllers/screeningController.js

const Screening = require("../models/screeningModel");
const Resume = require("../models/resumeModel");
const Job = require("../models/jobModel");
const { scoreResume } = require("../services/resumeScorerAgent"); // CHANGED: was aiAgentService
const { response } = require("../utils/response");
const { generateEmailDraft } = require("../services/emailDraftAgent");
const { CustomError } = require("../utils/errors");

async function screenResume(req, res, next) {
    try {
        const { resumeId } = req.body;
        if (!resumeId) throw new CustomError("resumeId is required", 400);

        const resume = await Resume.findById(resumeId);
        if (!resume) throw new CustomError("Resume not found", 404);
        if (!resume.parsedText) throw new CustomError("Resume has not been parsed yet", 400);

        const job = await Job.findById(resume.jobId);
        if (!job) throw new CustomError("Associated job not found", 404);

        // Ownership check: only the job creator or admin can screen its resumes
        if (req.user.role !== "admin" && job.createdBy?.toString() !== req.user.id) {
            throw new CustomError("Access denied", 403);
        }

        const existingScreening = await Screening.findOne({ resumeId: resume._id });
        if (existingScreening) {
            return response(res, 200, { screening: existingScreening }, "Screening already exists for this resume");
        }

        // Run AI scoring with extracted entities for better accuracy
        const aiResult = await scoreResume(
            resume.parsedText,
            job.description,
            resume.extractedEntities || {}, // Pass entities if available
            job.analyzedJD || null // Structured JD analysis
        );

        // aiResult fields now DIRECTLY match the Screening model — no manual mapping needed!
        const screening = new Screening({
            resumeId: resume._id,
            jobId: job._id,
            overallScore: aiResult.score,
            matchedSkills: aiResult.matchedSkills,
            missingSkills: aiResult.missingSkills,
            strengths: aiResult.strengths,
            weaknesses: aiResult.weaknesses,
            recommendation: aiResult.recommendation,
            rawAIResponse: aiResult,
        });
        await screening.save();

        // Update resume status
        resume.status = "screened";
        await resume.save();

        response(res, 201, { screening }, "Resume screened successfully");
    } catch (err) {
        next(err);
    }
}

// getRecommendation() REMOVED — the AI now returns the recommendation directly

async function getScreeningResults(req, res, next) {
    try {
        const { jobId } = req.params;

        // Verify the job exists; allow access to owner, admin, or assigned hiring manager
        const job = await Job.findById(jobId);
        if (!job) throw new CustomError("Job not found", 404);

        const isOwner = job.createdBy?.toString() === req.user.id;
        const isAssigned = job.assignedTo?.some((uid) => uid.toString() === req.user.id);
        if (req.user.role !== "admin" && !isOwner && !isAssigned) {
            throw new CustomError("Access denied", 403);
        }

        const screenings = await Screening.find({ jobId })
            .populate("resumeId", "candidateName candidateEmail fileName")
            .sort({ overallScore: -1 });
        response(res, 200, { screenings });
    } catch (err) {
        next(err);
    }
}

async function getScreeningById(req, res, next) {
    try {
        const screening = await Screening.findById(req.params.id)
            .populate("resumeId", "candidateName candidateEmail fileName parsedText")
            .populate("jobId", "title company description createdBy assignedTo")
            .populate("decidedBy", "name email");
        if (!screening) throw new CustomError("Screening result not found", 404);

        // Allow access to the job owner, admin, or any assigned hiring manager
        const job = screening.jobId;
        const isOwner = job?.createdBy?.toString() === req.user.id;
        const isAssigned = job?.assignedTo?.some((uid) => uid.toString() === req.user.id);
        if (req.user.role !== "admin" && !isOwner && !isAssigned) {
            throw new CustomError("Access denied", 403);
        }

        response(res, 200, { screening });
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/screening/:id/decision
// Body: { decision: string, notes?: string }
//
// Records the hiring manager's manual decision on a screened candidate.
// Allowed roles: hiring_manager (if assigned), recruiter (job owner), admin.
// ─────────────────────────────────────────────────────────────────────────────
async function makeDecision(req, res, next) {
    try {
        const { decision, notes = "" } = req.body;

        const validDecisions = ["shortlisted", "rejected", "on_hold", "offered"];
        if (!decision || !validDecisions.includes(decision)) {
            throw new CustomError(
                `decision must be one of: ${validDecisions.join(", ")}`,
                400
            );
        }

        // Load screening with job details for the access check
        const screening = await Screening.findById(req.params.id).populate(
            "jobId",
            "createdBy assignedTo"
        );
        if (!screening) throw new CustomError("Screening result not found", 404);

        const job = screening.jobId;
        const isOwner = job?.createdBy?.toString() === req.user.id;
        const isAssigned = job?.assignedTo?.some((uid) => uid.toString() === req.user.id);
        if (req.user.role !== "admin" && !isOwner && !isAssigned) {
            throw new CustomError("Access denied", 403);
        }

        screening.hiringManagerDecision = decision;
        screening.decidedBy = req.user.id;
        screening.decidedAt = new Date();
        screening.notes = notes;
        await screening.save();

        // Re-fetch with all populated fields for the response
        const updated = await Screening.findById(screening._id)
            .populate("resumeId", "candidateName candidateEmail fileName")
            .populate("jobId", "title company description createdBy assignedTo")
            .populate("decidedBy", "name email");

        response(res, 200, { screening: updated }, "Decision saved successfully");
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/screening/:id/generate-email
// Body: { emailType: "rejection" | "interview_invite" | "offer" }
//
// Uses LangChain to generate a professional email draft based on the
// screening result and candidate context. Returns { subject, body }.
// Accessible by: recruiter (job owner), hiring_manager (assigned), admin.
// ─────────────────────────────────────────────────────────────────────────────
async function generateEmail(req, res, next) {
    try {
        const { emailType } = req.body;
        if (!emailType) throw new CustomError("emailType is required", 400);

        // Load screening with all the context we need for the email
        const screening = await Screening.findById(req.params.id)
            .populate("resumeId", "candidateName candidateEmail")
            .populate("jobId", "title company createdBy assignedTo");

        if (!screening) throw new CustomError("Screening not found", 404);

        // Access check — same pattern as all other screening endpoints
        const job = screening.jobId;
        const isOwner = job?.createdBy?.toString() === req.user.id;
        const isAssigned = job?.assignedTo?.some((uid) => uid.toString() === req.user.id);
        if (req.user.role !== "admin" && !isOwner && !isAssigned) {
            throw new CustomError("Access denied", 403);
        }

        const { subject, body } = await generateEmailDraft({
            emailType,
            candidateName: screening.resumeId?.candidateName,
            jobTitle: job?.title,
            company: job?.company,
            score: screening.overallScore,
            strengths: screening.strengths,
            matchedSkills: screening.matchedSkills,
            missingSkills: screening.missingSkills,
        });

        response(res, 200, { subject, body }, "Email draft generated successfully");
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/screening/bulk
// Body: { jobId, concurrency? }
//
// Finds every resume with status "parsed" for this job and runs AI scoring
// on each, skipping any that already have a Screening document (idempotent).
// Processes in parallel batches of `concurrency` (default 3) to avoid
// overwhelming the AI API.
//
// Accessible by: recruiter (job creator) and admin only.
// ─────────────────────────────────────────────────────────────────────────────
async function bulkScreen(req, res, next) {
    try {
        const { jobId, concurrency = 3 } = req.body;
        if (!jobId) throw new CustomError("jobId is required", 400);

        const job = await Job.findById(jobId).select(
            "title company description createdBy assignedTo analyzedJD"
        );
        if (!job) throw new CustomError("Job not found", 404);

        // Only the job creator or admin can bulk-screen (not hired HMs)
        if (req.user.role !== "admin" && job.createdBy?.toString() !== req.user.id) {
            throw new CustomError("Access denied", 403);
        }

        // Fetch all parsed resumes for this job
        const parsedResumes = await Resume.find({ jobId, status: "parsed" }).select(
            "_id candidateName parsedText extractedEntities"
        );

        if (parsedResumes.length === 0) {
            return response(
                res, 200,
                { jobId, total: 0, succeeded: 0, skipped: 0, failed: 0, results: [] },
                "No parsed resumes to screen"
            );
        }

        // Idempotency: skip resumes that already have a Screening document
        const resumeIds = parsedResumes.map((r) => r._id);
        const existingScreenings = await Screening.find({
            resumeId: { $in: resumeIds },
        }).select("resumeId");
        const alreadyScreened = new Set(
            existingScreenings.map((s) => s.resumeId.toString())
        );

        const toProcess = parsedResumes.filter(
            (r) => !alreadyScreened.has(r._id.toString())
        );
        const skippedCount = parsedResumes.length - toProcess.length;

        console.log(
            `[BulkScreen] Job: ${job.title} | Parsed: ${parsedResumes.length} | ` +
            `To process: ${toProcess.length} | Skipped: ${skippedCount}`
        );

        const results = [];

        // Process in parallel batches to respect AI rate limits
        for (let i = 0; i < toProcess.length; i += concurrency) {
            const chunk = toProcess.slice(i, i + concurrency);

            const chunkResults = await Promise.allSettled(
                chunk.map(async (resume) => {
                    const aiResult = await scoreResume(
                        resume.parsedText,
                        job.description,
                        resume.extractedEntities || {},
                        job.analyzedJD || null
                    );

                    const screening = new Screening({
                        resumeId: resume._id,
                        jobId: job._id,
                        overallScore: aiResult.score,
                        matchedSkills: aiResult.matchedSkills,
                        missingSkills: aiResult.missingSkills,
                        strengths: aiResult.strengths,
                        weaknesses: aiResult.weaknesses,
                        recommendation: aiResult.recommendation,
                        rawAIResponse: aiResult,
                    });
                    await screening.save();

                    // Update resume status to "screened"
                    resume.status = "screened";
                    await resume.save();

                    return {
                        resumeId: resume._id,
                        candidateName: resume.candidateName,
                        score: aiResult.score,
                        recommendation: aiResult.recommendation,
                        screeningId: screening._id,
                    };
                })
            );

            chunkResults.forEach((settled, idx) => {
                const resume = chunk[idx];
                if (settled.status === "fulfilled") {
                    results.push({ status: "success", ...settled.value });
                } else {
                    console.error(
                        `[BulkScreen] Failed for resume ${resume._id}:`,
                        settled.reason?.message
                    );
                    results.push({
                        status: "failed",
                        resumeId: resume._id,
                        candidateName: resume.candidateName,
                        error: settled.reason?.message || "Unknown error",
                    });
                }
            });
        }

        const succeededCount = results.filter((r) => r.status === "success").length;
        const failedCount = results.filter((r) => r.status === "failed").length;

        // Add skipped entries for full response visibility
        parsedResumes
            .filter((r) => alreadyScreened.has(r._id.toString()))
            .forEach((r) => {
                results.push({
                    status: "skipped",
                    resumeId: r._id,
                    candidateName: r.candidateName,
                    reason: "Already screened",
                });
            });

        response(
            res, 200,
            {
                jobId,
                jobTitle: job.title,
                total: parsedResumes.length,
                succeeded: succeededCount,
                skipped: skippedCount,
                failed: failedCount,
                results,
            },
            `Bulk screening complete: ${succeededCount} screened, ${skippedCount} skipped, ${failedCount} failed`
        );
    } catch (err) {
        next(err);
    }
}

module.exports = { screenResume, getScreeningResults, getScreeningById, makeDecision, generateEmail, bulkScreen };

