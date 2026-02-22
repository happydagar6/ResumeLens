// src/controllers/questionsController.js

const mongoose = require("mongoose");
const InterviewQuestion = require("../models/interviewQuestionModel");
const Screening = require("../models/screeningModel");
const Resume = require("../models/resumeModel");
const Job = require("../models/jobModel");
const {
  generateInterviewQuestions,
} = require("../services/questionGeneratorAgent"); // CHANGED: was inline openai
const { response } = require("../utils/response");
const { CustomError } = require("../utils/errors");

async function generateQuestions(req, res, next) {
  try {
    const { screeningId } = req.body;
    if (!screeningId) throw new CustomError("screeningId is required", 400);

    const screening = await Screening.findById(screeningId);
    if (!screening) throw new CustomError("Screening result not found", 404);

    const resume = await Resume.findById(screening.resumeId);
    const job = await Job.findById(screening.jobId);
    if (!resume || !job)
      throw new CustomError("Associated resume or job not found", 404);

    // Access check: job creator, admin, or assigned hiring manager may generate questions
    const isOwner = job.createdBy?.toString() === req.user.id;
    const isAssigned = job.assignedTo?.some((uid) => uid.toString() === req.user.id);
    if (req.user.role !== "admin" && !isOwner && !isAssigned) {
      throw new CustomError("Access denied", 403);
    }

    // Generate questions via dedicated service (REPLACED 15 lines of inline code)
    const aiResult = await generateInterviewQuestions(
      resume.parsedText,
      job.description,
      screening, // Pass the whole screening object — service reads .overallScore, .matchedSkills, etc.
    );

    const interviewQuestion = new InterviewQuestion({
      screeningId: screening._id,
      resumeId: resume._id,
      jobId: job._id,
      questions: aiResult.questions, // Validated array from the service
    });
    await interviewQuestion.save();

    response(
      res,
      201,
      { interviewQuestion },
      "Interview questions generated successfully",
    );
  } catch (err) {
    next(err);
  }
}

async function getQuestionsByScreening(req, res, next) {
  try {
    const { screeningId } = req.params;
    const questions = await InterviewQuestion.findOne({ screeningId })
      .populate("resumeId", "candidateName candidateEmail")
      .populate("jobId", "title company createdBy assignedTo");
    if (!questions)
      throw new CustomError("No questions found for this screening", 404);

    // Access: job creator, admin, or assigned hiring manager
    const job = questions.jobId;
    const isOwner = job?.createdBy?.toString() === req.user.id;
    const isAssigned = job?.assignedTo?.some((uid) => uid.toString() === req.user.id);
    if (req.user.role !== "admin" && !isOwner && !isAssigned) {
      throw new CustomError("Access denied", 403);
    }

    response(res, 200, { questions });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/questions/generate-batch
// Body: { jobId, minScore?, concurrency? }
//
// Generates interview questions for ALL screened candidates in a job
// who scored at or above the minScore threshold.
//
// - minScore:    minimum overallScore to qualify (default: 60)
// - concurrency: how many AI calls run in parallel at once (default: 3)
// - Idempotent:  candidates who already have questions are SKIPPED (not re-run)
// ─────────────────────────────────────────────────────────────────────────────

async function generateBatch(req, res, next) {
  try {
    const { jobId, minScore = 60, concurrency = 3 } = req.body;

    // Input validation
    if (!jobId) throw new CustomError("jobId is required", 400);
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
        throw new CustomError("Invalid jobId format", 400);
    }

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      throw new CustomError("Invalid job ID", 400);
    }

    // Confirm the job exists
    const job = await Job.findById(jobId).select("title company description createdBy assignedTo");
    if (!job) throw new CustomError("Job not found", 404);

    // Access check: job creator, admin, or assigned hiring manager
    const isOwner = job.createdBy?.toString() === req.user.id;
    const isAssigned = job.assignedTo?.some((uid) => uid.toString() === req.user.id);
    if (req.user.role !== "admin" && !isOwner && !isAssigned) {
      throw new CustomError("Access denied", 403);
    }

    // Find qualifying screenings
    // Only candidates who have been scored AND scored >= minScore
    const qualifyingScreenings = await Screening.find({
      jobId,
      overallScore: { $gte: minScore },
    }).select(
      "_id resumeId overallScore matchedSkills missingSkills strenghts recommendation",
    );

    if (qualifyingScreenings.length === 0) {
      return response(
        res,
        200,
        {
          jobId,
          jobTitle: job.title,
          totalQualifying: 0,
          succeeded: 0,
          skipped: 0,
          failed: 0,
          results: [],
        },
        `No candidates scored ${minScore}+ for this job`,
      );
    }

    // ── Check which screenings already have questions (idempotency) ───
    // Fetch all existing InterviewQuestion docs for these screening IDs
    // in one DB query — avoids N+1 queries
    const screeningIds = qualifyingScreenings.map((s) => s._id);
    const existingQuestions = await InterviewQuestion.find({
      screeningId: { $in: screeningIds },
    }).select("screeningId");

    // Build a Set of screeningIds that already have questions to skip them
    const alreadyHasQuestions = new Set(
      existingQuestions.map((q) => q.screeningId.toString()),
    );

    // Seperate into "needs generation" vs "skip"
    const toProcess = qualifyingScreenings.filter(
      (s) => !alreadyHasQuestions.has(s._id.toString()),
    );
    const skippedCount = qualifyingScreenings.length - toProcess.length;

    console.log(
      `[BatchQuestions] Job: ${job.title} | Qualifying: ${qualifyingScreenings.length} | ` +
        `To process: ${toProcess.length} | Already done (skip): ${skippedCount}`,
    );

    // ── Fetch resumes for all screenings that need processing ─────────
    // One batch query instead of one per screening
    const resumeIds = toProcess.map((s) => s.resumeId); // Array of ObjectIds
    const resumes = await Resume.find({ _id: { $in: resumeIds } }).select(
      "_id candidateName parsedText",
    );

    // Build lookup map: resumeId -> resume doc
    const resumeMap = resumes.reduce((acc, r) => {
      acc[r._id.toString()] = r;
      return acc;
    }, {});

    // ── Process in parallel batches ───────────────────────────────────
    // Same chunk strategy as pipelineController.js batchScreen

    const results = [];

    for (let i = 0; i < toProcess.length; i += concurrency) {
      const chunk = toProcess.slice(i, i + concurrency);

      const chunkResults = await Promise.allSettled(
        chunk.map(async (screening) => {
          const resume = resumeMap[screening.resumeId.toString()];

          if (!resume) {
            throw new Error(`Resume ${screening.resumeId} not found`);
          }
          if (!resume.parsedText) {
            throw new Error(`Resume ${resume._id} has no parsed text`);
          }

          // Generate questions using the existing LangChain service
          const aiResult = await generateInterviewQuestions(
            resume.parsedText,
            job.description,
            screening,
          );

          // Save to DB
          const doc = new InterviewQuestion({
            screeningId: screening._id,
            resumeId: screening.resumeId,
            jobId: screening.jobId,
            questions: aiResult.questions,
          });
          await doc.save();

          return {
            screeningId: screening._id,
            candidateName: resume.candidateName,
            score: screening.overallScore,
            questionsGenerated: aiResult.questions.length,
            interviewQuestionId: doc._id,
          };
        }),
      );

      // Map settled results into plain success/failure objects
      chunkResults.forEach((settled, idx) => {
        const screening = chunk[idx];
        const resume = resumeMap[screening.resumeId.toString()];

        if (settled.status === "fulfilled") {
          results.push({
            status: "success",
            ...settled.value,
          });
        } else {
          console.error(
            `[BatchQuestions] Failed for screening ${screening._id}:`,
            settled.reason?.message,
          );
          results.push({
            status: "failed",
            screeningId: screening._id,
            candidateName: resume?.candidateName || "Unknown",
            score: screening.overallScore,
            error: settled.reason?.message || "Unknown error",
          });
        }
      });
    }

    // ── Build summary statistics ──────────────────────────────────────
    const succeededCount = results.filter((r) => r.status === "success").length;
    const failedCount = results.filter((r) => r.status === "failed").length;

    // Add skipped entries to the results list so the caller has full visibility
    qualifyingScreenings
      .filter((s) => alreadyHasQuestions.has(s._id.toString()))
      .forEach((s) => {
        results.push({
          status: "skipped",
          screeningId: s._id,
          score: s.overallScore,
          reason: "Questions already generated for this screening",
        });
      });
    response(
      res,
      200,
      {
        jobId,
        jobTitle: job.title,
        minScore,
        totalQualifying: qualifyingScreenings.length,
        succeeded: succeededCount,
        skipped: skippedCount,
        failed: failedCount,
        results,
      },
      `Batch question generation complete: ${succeededCount} generated, ${skippedCount} skipped, ${failedCount} failed`,
    );
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/questions/bank/:jobId
//
// Aggregates ALL interview questions generated for every candidate on a job.
// Frontend groups and filters these by category.
// Accessible by: job creator, assigned hiring managers, admin.
// ─────────────────────────────────────────────────────────────────────────────
async function getQuestionBank(req, res, next) {
    try {
        const { jobId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            throw new CustomError("Invalid job ID", 400);
        }

        const job = await Job.findById(jobId).select("title company createdBy assignedTo");
        if (!job) throw new CustomError("Job not found", 404);

        const isOwner = job.createdBy?.toString() === req.user.id;
        const isAssigned = job.assignedTo?.some((uid) => uid.toString() === req.user.id);
        if (req.user.role !== "admin" && !isOwner && !isAssigned) {
            throw new CustomError("Access denied", 403);
        }

        // Fetch all question docs for this job, newest first
        const docs = await InterviewQuestion.find({ jobId })
            .populate("resumeId", "candidateName candidateEmail")
            .populate("screeningId", "overallScore recommendation")
            .sort({ createdAt: -1 });

        const totalQuestions = docs.reduce((sum, d) => sum + d.questions.length, 0);
        const usedCount = docs.reduce(
            (sum, d) => sum + d.questions.filter((q) => q.usedInInterview).length,
            0
        );

        response(res, 200, {
            jobId,
            jobTitle: job.title,
            docCount: docs.length,
            totalQuestions,
            usedCount,
            docs,
        });
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/questions/:docId/toggle-used
// Body: { questionId }
//
// Toggles the usedInInterview boolean on a specific question subdocument.
// Uses Mongoose subdocument .id() helper to find the nested question by _id.
// Accessible by: job creator, assigned hiring managers, admin.
// ─────────────────────────────────────────────────────────────────────────────
async function toggleQuestionUsed(req, res, next) {
    try {
        const { docId } = req.params;
        const { questionId } = req.body;
        if (!questionId) throw new CustomError("questionId is required", 400);

        const doc = await InterviewQuestion.findById(docId).populate(
            "jobId", "createdBy assignedTo"
        );
        if (!doc) throw new CustomError("Question document not found", 404);

        const job = doc.jobId;
        const isOwner = job?.createdBy?.toString() === req.user.id;
        const isAssigned = job?.assignedTo?.some((uid) => uid.toString() === req.user.id);
        if (req.user.role !== "admin" && !isOwner && !isAssigned) {
            throw new CustomError("Access denied", 403);
        }

        // .id() is the Mongoose helper for finding a subdocument by _id
        const question = doc.questions.id(questionId);
        if (!question) throw new CustomError("Question not found in document", 404);

        question.usedInInterview = !question.usedInInterview;
        await doc.save();

        response(res, 200, {
            questionId,
            usedInInterview: question.usedInInterview,
        }, "Question usage toggled");
    } catch (err) {
        next(err);
    }
}

module.exports = { generateQuestions, getQuestionsByScreening, generateBatch, getQuestionBank, toggleQuestionUsed };
