// src/services/backgroundQueue.js
// In-process background queue using p-queue + MongoDB job tracking.
// Replaces BullMQ + Redis with a simpler, zero-dependency approach.

const PQueue = require("p-queue").default;
const ProcessingJob = require("../models/processingJobModel");
const { runScreeningPipeline } = require("../agents/screeningGraph");

// ── Concurrency-limited queue ─────────────────────────────────────────────────
// concurrency: 3 → max 3 AI screening calls in parallel at any time.
// This prevents overloading the OpenAI API rate limits.
const screeningQueue = new PQueue({ concurrency: 3 });

// Log queue events for debugging
screeningQueue.on("active", () => {
    console.log(`[Queue] Active: ${screeningQueue.pending} running, ${screeningQueue.size} waiting`);
});

// ── Main function: enqueue a screening job ────────────────────────────────────
// Called by pipelineController.screenSingle() instead of directly awaiting the pipeline.
//
// Returns the ProcessingJob document immediately (the caller sends HTTP 202).
// The actual AI work happens in the background via p-queue.

async function enqueueScreening({ resumeId, jobId, userId }) {
    // 1. Deduplication: check if this resume already has an active job
    const existingJob = await ProcessingJob.findOne({
        resumeId,
        status: { $in: ["queued", "processing"] },
    });

    if (existingJob) {
        console.log(`[Queue] Resume ${resumeId} already has an active job: ${existingJob._id}`);
        return existingJob; // Return the existing job — frontend can poll its status
    }

    // 2. Create a new ProcessingJob document in MongoDB
    const processingJob = await ProcessingJob.create({
        type: "screening",
        resumeId,
        jobId,
        createdBy: userId,
        status: "queued",
    });

    console.log(`[Queue] Enqueued screening job ${processingJob._id} for resume ${resumeId}`);

    // 3. Add to p-queue — this returns immediately (does NOT await the pipeline)
    //    The arrow function runs later when a concurrency slot opens up.
    screeningQueue.add(async () => {
        try {
            // Mark as processing
            await ProcessingJob.findByIdAndUpdate(processingJob._id, {
                status: "processing",
                startedAt: new Date(),
            });

            // Run the actual AI pipeline (this takes 10-30 seconds)
            const result = await runScreeningPipeline(resumeId);

            if (result.success) {
                // Mark as completed with result data
                await ProcessingJob.findByIdAndUpdate(processingJob._id, {
                    status: "completed",
                    completedAt: new Date(),
                    result: {
                        screeningId: result.screeningId,
                        score: result.score,
                        recommendation: result.recommendation,
                        warnings: result.warnings || [],
                    },
                });
                console.log(`[Queue] Job ${processingJob._id} completed — Score: ${result.score}`);
            } else {
                // Pipeline returned success: false (e.g., missing parsedText)
                await ProcessingJob.findByIdAndUpdate(processingJob._id, {
                    status: "failed",
                    completedAt: new Date(),
                    error: result.error || "Pipeline returned failure",
                });
                console.error(`[Queue] Job ${processingJob._id} failed: ${result.error}`);
            }
        } catch (err) {
            // Unexpected crash in the pipeline
            await ProcessingJob.findByIdAndUpdate(processingJob._id, {
                status: "failed",
                completedAt: new Date(),
                error: err.message || "Unknown error",
            });
            console.error(`[Queue] Job ${processingJob._id} crashed:`, err.message);
        }
    });

    // 4. Return the job doc immediately — don't wait for the pipeline
    return processingJob;
}

// ── Batch enqueue ─────────────────────────────────────────────────────────────
// Enqueues multiple resumes at once. Each gets its own ProcessingJob document.
// Returns an array of ProcessingJob documents.

async function enqueueBatchScreening({ resumeIds, jobId, userId }) {
    const jobs = [];
    for (const resumeId of resumeIds) {
        const job = await enqueueScreening({ resumeId, jobId, userId });
        jobs.push(job);
    }
    return jobs;
}

// ── Queue stats (for admin dashboard or debugging) ────────────────────────────
function getQueueStats() {
    return {
        active: screeningQueue.pending,   // currently running
        waiting: screeningQueue.size,     // waiting for a slot
    };
}

module.exports = { enqueueScreening, enqueueBatchScreening, getQueueStats };