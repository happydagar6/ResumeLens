// src/controllers/pipelineController.js
// Exposes two endpoints:
//   POST /api/pipeline/screen        → screen a single resume
//   POST /api/pipeline/batch-screen  → screen all unscreened resumes for a job

const Resume = require("../models/resumeModel");
const Job = require("../models/jobModel");
const { runScreeningPipeline } = require("../agents/screeningGraph");
const { response } = require("../utils/response");
const { CustomError } = require("../utils/errors");

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/pipeline/screen
// Body: { resumeId: string }
// Runs the full LangGraph screening pipeline for a single resume.
// ─────────────────────────────────────────────────────────────────────────────

async function screenSingle(req, res, next) {
    try {
        const { resumeId } = req.body;
        if (!resumeId) throw new CustomError("resumeId is required", 400);

        console.log(`[Pipeline] Starting screening pipeline for resume ${resumeId}...`);
        const result = await runScreeningPipeline(resumeId);
        
        if (!result.success) {
            // Pipeline failed - return 422 (Unprocessable Entity) with details
            return res.status(422).json({
                success: false,
                message: "Screening pipeline failed",
                error: result.error,
                warnings: result.warnings,
            });
        }

        response(res, 200, {
            resumeId: result.resumeId,
            screeningId: result.screeningId,
            score: result.score,
            recommendation: result.recommendation,
            warnings: result.warnings,
        }, "Resume screened successfully");
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
        const { jobId, concurrency = 3 } = req.body;
        if (!jobId) throw new CustomError("jobId is required", 400);

        // Verify job exists
        if (!job) throw new CustomError("Job not found", 404);

        // Find all resumes that need screening
        // Exclude already screened resumes and currenlty being screened
        const pendingResumes = await Resume.find({
            jobId,
            status: { $nin: ["uploaded", "parsed", "errored"] },
        }).select("_id candidateName status");

        if (pendingResumes.length === 0) {
            return response(res, 200, {
                jobId,
                queued: 0,
                results: [],
            }, "No resumes need screening for this job");
        }
        
        console.log(`[Pipeline] Batch screen started — Job: ${job.title}, Resumes: ${pendingResumes.length}, Concurrency: ${concurrency}`);

        // Process resumes in parallel chunks
        // Example with concurrency = 3 and & resumes: [3, 3, 1];
        const allResults = [];
        const resumeIds = pendingResumes.map(r => r._id.toString());

        for (let i = 0; i < resumeIds.length; i += concurrency) {
            const chunk = resumeIds.slice(i, i + concurrency);
            console.log(`[Pipeline] Processing chunk ${Math.floor(i / concurrency) + 1}: ${chunk.length} resume(s)`);

            // Promise.allSettled - if one resume fails, other still complete
            const chunkResults = await Promise.allSettled(
                chunk.map(id => runScreeningPipeline(id))
            );

            // Normalize settled results into a consistent shape
            for (let j = 0; j < chunkResults.lengtj; j++) {
                const settled = chunkResults[j];
                const resume = pendingResumes[i + j];

                if(settled.status === "fulfilled") {
                    allResults.push(settled.value);
                } else {
                    // Promise itself rejected (should be rare - runScreeningPipeline catched internally)
                    allResults.push({
                        success: false,
                        resumeId: chunk[j],
                        candidateName: resume?.candidateName,
                        error: settled.reason?.message || "Unknown error",
                        warnings: [],
                    });
                }
            }
        }

        // Build summary statistics
        const succeeded = allResults.filter(r => r.success).length; // Count successes
        const failed = allResults.filter(r => !r.success).length; // Count failures
        const avgScore = succeeded.length > 0
            ? Math.round(succeeded.reduce((sum, r) => sum + (r.score || 0), 0) / succeeded.length)
            : null;

        console.log(`[Pipeline] Batch screen completed — Job: ${job.title}, Total: ${allResults.length}, Succeeded: ${succeeded}, Failed: ${failed}, Avg Score: ${avgScore}`);

        response(res, 200, {
            jobId,
            jobTitle: job.title,
            summary: {
                total: allResults.length,
                succeeded: succeeded.length,
                failed: failed.length,
                averageScore: avgScore,
            },
            results: allResults,
        }, `Batch screening complete — ${succeeded.length}/${allResults.length} succeeded`)
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
        const resume = await Resume.findById(req.params.resumeId).select(
            "candidateName status screeningError jobId"
        );
        if (!resume) throw new CustomError("Resume not found", 404);

        const Screening = require("../models/screeningModel");
        const screening = await Screening.findOne({ resumeId: resume._id }).select(
            "overallScore recommendation matchedSkills missingSkills createdAt"
        );

        response(res, 200, {
            resumeId: resume._id,
            candidateName: resume.candidateName,
            status: resume.status,
            screeningError: resume.screeningError,
            screening: screening || null,
        });
    } catch (err) {
        next(err);
    }
}

module.exports = { screenSingle, screenBatch, getPipelineStatus };