// src/services/backgroundQueue.js
const { Queue, Worker } = require("bullmq");
const { createRedisConnection } = require("../config/redis");
const ProcessingJob = require("../models/processingJobModel");
const { runScreeningPipeline } = require("../agents/screeningGraph");
const Resume = require("../models/resumeModel");
const { broadcastToUser, removeClient } = require("./sseService");
const { createAuditLog } = require("../utils/auditLogModel");

const QUEUE_NAME = "resume-screening";

// 1. Create the Queue (adds jobs to Redis)
const screeningQueue = new Queue(QUEUE_NAME, {
  connection: createRedisConnection(), // Connects to Redis
  skipConfigCheck: true, // Suppress Upstash eviction policy warning
  defaultJobOptions: { // Default options for all jobs
    attempts: 3, // Retry 3 times if it fails
    backoff: { type: "exponential", delay: 2000 }, // Exponential backoff
    removeOnComplete: { count: 100, age: 24 * 60 * 60 }, // Remove completed jobs after 24 hours
    removeOnFail: { count: 200 }, // Remove failed jobs after 24 hours
  },
});

// 2. Create the Worker (picks up jobs from Redis and processes them)
const screeningWorker = new Worker(
  QUEUE_NAME, // The name of the queue to listen to
  async (job) => {
    const { resumeId, jobId, userId, processingJobId } = job.data; // Destructure the job data
    console.log(`[Worker] Processing job ${job.id} — resumeId: ${resumeId}`); // Log the job ID and resume ID

    if (processingJobId) { // If a processing job ID is provided

      const currentJob = await ProcessingJob.findById(processingJobId);
      if (currentJob && currentJob.status === "cancelled") {
        console.log(`[Worker] Job ${job.id} was cancelled by user. Skipping.`);
        return { success: false, cancelled: true };
      }

      await ProcessingJob.findByIdAndUpdate(processingJobId, {
        status: "processing",
        startedAt: new Date(),
      })
    }

    const result = await runScreeningPipeline(resumeId); // Run the screening pipeline

    // ── Check if user cancelled while the AI was processing ───────────────
    if (processingJobId) {
      const freshJob = await ProcessingJob.findById(processingJobId);
      if (freshJob && freshJob.status === "cancelled") {
        console.log(`[Worker] Job ${job.id} was cancelled during AI execution. Discarding result.`);
        if (result?.screeningId) {
          const Screening = require("../models/screeningModel");
          await Screening.findByIdAndDelete(result.screeningId);
        }
        const Resume = require("../models/resumeModel");
        await Resume.findByIdAndUpdate(resumeId, { status: "parsed" });
        return { success: false, cancelled: true };
      }
    }

    if (!result.success) { // If the pipeline failed
      throw new Error(result.error || "Pipeline returned failure");
    }

    if (processingJobId) { // If a processing job ID is provided
      await ProcessingJob.findByIdAndUpdate(processingJobId, {
        status: "completed", // Update status to completed
        completedAt: new Date(), // Set completed at to current date
        result: { // Set the result
          screeningId: result.screeningId, // Screening ID
          score: result.score, // Score
          recommendation: result.recommendation, // Recommendation
          warnings: result.warnings || [], // Warnings
        },
      });
    }

    console.log(`[Worker] Job ${job.id} completed — Score: ${result.score}`); // Log the job ID and score

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

    // ── Audit Log ─────────
    await createAuditLog({
      resumeId,
      jobId,
      action: "SCREENED", // Action performed
      performedBy: null, // Done automatically by the AI system
      metadata: { score: result.score }, // Score
    });

    return result;
  },
  {
    connection: createRedisConnection(), // Connects to Redis
    skipConfigCheck: true, // Suppress Upstash eviction policy warning
    concurrency: 3, // Max 3 parallel AI calls
  },
);

// 3. Worker Error Handling
screeningWorker.on("failed", async (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed: ${err.message}`); // Log the job ID and error
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
async function enqueueScreening({ resumeId, jobId, userId }) { // Controller method to enqueue a screening job
  const existingJob = await ProcessingJob.findOne({ // Check if there is any existing job for the resume
    resumeId, // Resume ID
    status: { $in: ["queued", "processing"] }, // Status: queued or processing
  });

  if (existingJob) {
    const resume = await Resume.findById(resumeId).select("status");
    if (resume && resume.status === "parsed") {
      await ProcessingJob.findByIdAndUpdate(existingJob._id, {
        status: "cancelled",
        completedAt: new Date(),
      });
    } else {
      return existingJob;
    }
  }

  const processingJob = await ProcessingJob.create({
    type: "screening",
    resumeId,
    jobId,
    createdBy: userId,
    status: "queued",
  });

  await screeningQueue.add( // Add job to the queue
    "screen-resume",
    {
      resumeId: resumeId.toString(), // Resume ID
      jobId: jobId.toString(), // Job ID
      userId: userId.toString(), // User ID
      processingJobId: processingJob._id.toString(), // Processing job ID
    },
    { jobId: `proc-${processingJob._id}` }, // Unique for every screening run!
  );

  return processingJob; // Return processing job
}

async function enqueueBatchScreening({ resumeIds, jobId, userId }) { // Controller method to enqueue a batch screening job
  const jobs = []; // Create an array to store the jobs
  for (const resumeId of resumeIds) { // Iterate over the resume IDs
    const job = await enqueueScreening({ resumeId, jobId, userId }); // Enqueue a screening job for each resume ID
    jobs.push(job); // Add the job to the array
  }
  return jobs; // Return the array of jobs
}

async function getQueueStats() {
  const [waiting, active, completed, failed] = await Promise.all([ // Get the statistics of the queue
    screeningQueue.getWaitingCount(), // Number of jobs waiting in the queue
    screeningQueue.getActiveCount(), // Number of jobs active in the queue
    screeningQueue.getCompletedCount(), // Number of jobs completed in the queue
    screeningQueue.getFailedCount(), // Number of jobs failed in the queue
  ]);
  return { waiting, active, completed, failed }; // Return the statistics of the queue
}

// Remove all waiting / delayed screening jobs for a specific job from Redis
async function cancelBatchScreening(jobId) {
  const waitingJobs = await screeningQueue.getJobs(["waiting", "delayed"]);
  let removedCount = 0;

  for (const job of waitingJobs) {
    if (job.data?.jobId === jobId.toString()) {
      await job.remove(); // Remove job from Redis Queue
      removedCount++;
    }
  }
  return { removedCount };
}



async function shutdownQueue() { // Controller method to shutdown the queue
  await screeningWorker.close(); // Close the worker
  await screeningQueue.close(); // Close the queue
}

module.exports = { // Export the controller methods
  enqueueScreening, // Controller method to enqueue a screening job
  enqueueBatchScreening, // Controller method to enqueue a batch screening job
  cancelBatchScreening, // Controller method to cancel screenings
  getQueueStats, // Controller method to get the statistics of the queue
  shutdownQueue, // Controller method to shutdown the queue
};
