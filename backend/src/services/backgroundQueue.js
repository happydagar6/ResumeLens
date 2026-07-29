// src/services/backgroundQueue.js
const { Queue, Worker } = require("bullmq");
const { createRedisConnection } = require("../config/redis");
const ProcessingJob = require("../models/processingJobModel");
const { runScreeningPipeline } = require("../agents/screeningGraph");
const { broadcastToUser } = require("./sseService");
const { createAuditLog } = require("../utils/auditLogModel");

const QUEUE_NAME = "resume-screening";

// 1. Create the Queue (adds jobs to Redis)
const screeningQueue = new Queue(QUEUE_NAME, {
  connection: createRedisConnection(),
  skipConfigCheck: true, // Suppress Upstash eviction policy warning
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 100, age: 24 * 60 * 60 },
    removeOnFail: { count: 200 },
  },
});

// 2. Create the Worker (picks up jobs from Redis and processes them)
const screeningWorker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const { resumeId, jobId, userId, processingJobId } = job.data;
    console.log(`[Worker] Processing job ${job.id} — resumeId: ${resumeId}`);

    if (processingJobId) {
      await ProcessingJob.findByIdAndUpdate(processingJobId, {
        status: "processing",
        startedAt: new Date(),
      });
    }

    const result = await runScreeningPipeline(resumeId);

    if (!result.success) {
      throw new Error(result.error || "Pipeline returned failure");
    }

    if (processingJobId) {
      await ProcessingJob.findByIdAndUpdate(processingJobId, {
        status: "completed",
        completedAt: new Date(),
        result: {
          screeningId: result.screeningId,
          score: result.score,
          recommendation: result.recommendation,
          warnings: result.warnings || [],
        },
      });
    }

    console.log(`[Worker] Job ${job.id} completed — Score: ${result.score}`);

    // ── SSE Push: Notify the recruiter's browser instantly ──────────────
    // Push a "screening_complete" event to the user who triggered this job.
    // The frontend listens for this and refreshes the candidate card automatically.
    broadcastToUser(userId, "screening_complete", {
      resumeId,
      jobId,
      score: result.score,
      recommendation: result.recommendation,
      screeningId: result.screeningId,
    });

    // --- ADD THIS BLOCK FOR AUDIT LOGGING ---
    await createAuditLog({
      resumeId,
      jobId,
      action: "SCREENED",
      performedBy: null, // Done automatically by the AI system
      metadata: { score: result.score },
    });
    // ----------------------------------------

    return result;
  },
  {
    connection: createRedisConnection(),
    skipConfigCheck: true, // Suppress Upstash eviction policy warning
    concurrency: 3, // Max 3 parallel AI calls
  },
);

// 3. Worker Error Handling
screeningWorker.on("failed", async (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed: ${err.message}`);
  if (job && job.attemptsMade >= job.opts.attempts) {
    const { userId, resumeId, jobId, processingJobId } = job.data;

    if (processingJobId) {
      await ProcessingJob.findByIdAndUpdate(processingJobId, {
        status: "failed",
        completedAt: new Date(),
        error: err.message || "Unknown error after all retries",
      });
    }

    // ── SSE Push: Notify the recruiter about the failure instantly ───────
    broadcastToUser(userId, "screening_failed", {
      resumeId,
      jobId,
      error: err.message,
    });
  }
});


// 4. Controller Methods
async function enqueueScreening({ resumeId, jobId, userId }) {
  const existingJob = await ProcessingJob.findOne({
    resumeId,
    status: { $in: ["queued", "processing"] },
  });

  if (existingJob) return existingJob;

  const processingJob = await ProcessingJob.create({
    type: "screening",
    resumeId,
    jobId,
    createdBy: userId,
    status: "queued",
  });

  await screeningQueue.add(
    "screen-resume",
    {
      resumeId: resumeId.toString(),
      jobId: jobId.toString(),
      userId: userId.toString(),
      processingJobId: processingJob._id.toString(),
    },
    { jobId: `resume-${resumeId}` },
  );

  return processingJob;
}

async function enqueueBatchScreening({ resumeIds, jobId, userId }) {
  const jobs = [];
  for (const resumeId of resumeIds) {
    const job = await enqueueScreening({ resumeId, jobId, userId });
    jobs.push(job);
  }
  return jobs;
}

async function getQueueStats() {
  const [waiting, active, completed, failed] = await Promise.all([
    screeningQueue.getWaitingCount(),
    screeningQueue.getActiveCount(),
    screeningQueue.getCompletedCount(),
    screeningQueue.getFailedCount(),
  ]);
  return { waiting, active, completed, failed };
}

async function shutdownQueue() {
  await screeningWorker.close();
  await screeningQueue.close();
}

module.exports = {
  enqueueScreening,
  enqueueBatchScreening,
  getQueueStats,
  shutdownQueue,
};
