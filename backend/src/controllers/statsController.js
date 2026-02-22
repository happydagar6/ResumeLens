// src/controllers/statsController.js
// Phase 6: Dashboard Stats API
//
// Endpoints:
//   GET /api/stats/overview         → Site-wide aggregate stats
//   GET /api/stats/job/:jobId       → Per-job stats with top candidates

const mongoose = require("mongoose");
const Job = require("../models/jobModel");
const Resume = require("../models/resumeModel");
const Screening = require("../models/screeningModel");
const { response } = require("../utils/response");
const { CustomError } = require("../utils/errors");

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/stats/overview
// Returns aggregate statistics scoped to the current user.
// Admins see global platform stats. Everyone else sees only their own data.
// ─────────────────────────────────────────────────────────────────────────────
async function getOverviewStats(req, res, next) {
  try {
    const isAdmin = req.user.role === "admin";

    // ── Build scoped filters ─────────────────────────────────────────────
    // jobFilter:        used for Job.countDocuments / Job.find
    // resumeFilter:     used for Resume.countDocuments / Resume.aggregate
    // screeningMatch:   used as { $match: ... } inside Screening.aggregate
    //
    // For non-admins, we resolve the user's job IDs once here and reuse
    // them in every sub-query below — avoids a $lookup in each aggregation.
    const jobFilter = isAdmin ? {} : { createdBy: req.user.id };

    let resumeFilter = {};
    let screeningMatch = {};

    if (!isAdmin) {
      const userJobs = await Job.find(jobFilter).select("_id");
      const jobIds = userJobs.map((j) => j._id);
      resumeFilter = { jobId: { $in: jobIds } };
      screeningMatch = { jobId: { $in: jobIds } };
    }

    // ── Run all independent DB queries in parallel ───────────────────────
    const [
      totalJobs,
      openJobs,
      closedJobs,
      totalResumes,
      totalScreened,
      totalErrors,
      screeningAggregation,
      recommendationBreakdown,
      resumeStatusBreakdown,
      recentJobs,
    ] = await Promise.all([
      // Job counts — scoped to user
      Job.countDocuments(jobFilter),
      Job.countDocuments({ ...jobFilter, status: "open" }),
      Job.countDocuments({ ...jobFilter, status: "closed" }),

      // Resume counts — scoped via jobIds
      Resume.countDocuments(resumeFilter),
      Resume.countDocuments({ ...resumeFilter, status: "screened" }),
      Resume.countDocuments({ ...resumeFilter, status: "error" }),

      // Scoring stats — avg, max, min across user's screenings
      Screening.aggregate([
        { $match: screeningMatch },
        {
          $group: {
            _id: null,
            avgScore: { $avg: "$overallScore" },
            highestScore: { $max: "$overallScore" },
            lowestScore: { $min: "$overallScore" },
            totalScreenings: { $sum: 1 },
          },
        },
      ]),

      // How many screenings per recommendation category — user scoped
      Screening.aggregate([
        { $match: screeningMatch },
        {
          $group: {
            _id: "$recommendation",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),

      // Resume pipeline breakdown (all statuses) — user scoped
      Resume.aggregate([
        { $match: resumeFilter },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),

      // 5 most recently created jobs with candidate counts — user scoped
      Job.aggregate([
        { $match: isAdmin ? {} : { createdBy: new mongoose.Types.ObjectId(req.user.id) } },
        { $sort: { createdAt: -1 } },
        { $limit: 5 },
        { $lookup: { from: "resumes", localField: "_id", foreignField: "jobId", as: "_res" } },
        { $lookup: { from: "screenings", localField: "_id", foreignField: "jobId", as: "_scr" } },
        {
          $addFields: {
            resumeCount: { $size: "$_res" },
            screenedCount: { $size: "$_scr" },
            shortlistedCount: {
              $size: {
                $filter: {
                  input: "$_scr",
                  as: "s",
                  cond: { $eq: ["$$s.hiringManagerDecision", "shortlisted"] },
                },
              },
            },
          },
        },
        { $project: { _res: 0, _scr: 0 } },
      ]),
    ]);

    // Flatten aggregation results into plain objects
    const scoring = screeningAggregation[0] || {
      avgScore: 0,
      highestScore: 0,
      lowestScore: 0,
      totalScreenings: 0,
    };

    // Convert recommendation array → { strong_yes: 4, yes: 10, ... }
    const recommendations = recommendationBreakdown.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    // Convert resume status array → { uploaded: 2, parsed: 5, screened: 20, error: 1, ... }
    const resumesByStatus = resumeStatusBreakdown.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    // Screening rate = % of resumes that have been screened
    const screeningRate =
      totalResumes > 0 ? Math.round((totalScreened / totalResumes) * 100) : 0;

    response(
      res,
      200,
      {
        jobs: {
          total: totalJobs,
          open: openJobs,
          closed: closedJobs,
          draft: totalJobs - openJobs - closedJobs,
        },
        resumes: {
          total: totalResumes,
          screened: totalScreened,
          errors: totalErrors,
          pending: totalResumes - totalScreened - totalErrors,
          screeningRate, // % of resumes successfully screened
          byStatus: resumesByStatus,
        },
        screening: {
          totalScreenings: scoring.totalScreenings,
          avgScore: scoring.avgScore
            ? Math.round(scoring.avgScore * 10) / 10 // 1 decimal place
            : 0,
          highestScore: scoring.highestScore || 0,
          lowestScore: scoring.lowestScore || 0,
          byRecommendation: recommendations,
        },
        recentJobs,
      },
      "Overview stats fetched successfully",
    );
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/stats/job/:jobId
// Returns per-job statistics:
//   - Resume pipeline counts (total, screened, pending, errors)
//   - Score stats (avg, highest, lowest)
//   - Recommendation breakdown
//   - Top 10 candidates sorted by score
// ─────────────────────────────────────────────────────────────────────────────
async function getJobStats(req, res, next) {
  try {
    const { jobId } = req.params;

    // Validate ObjectId format before hitting DB
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      throw new CustomError("Invalid job ID", 400);
    }

    // Confirm the job exists
    const job = await Job.findById(jobId).select(
      "title company status type description skills createdAt createdBy",
    );
    if (!job) throw new CustomError("Job not found", 404);

    // Ownership check: only the job creator or an admin can view its stats
    if (
      req.user.role !== "admin" &&
      job.createdBy?.toString() !== req.user.id
    ) {
      throw new CustomError("Access denied", 403);
    }

    const jobObjectId = new mongoose.Types.ObjectId(jobId);

    // Run all aggregations in parallel
    const [
      totalResumes,
      screenedResumes,
      errorResumes,
      screeningStats,
      recommendationBreakdown,
      topCandidates,
      scoreDistribution,
    ] = await Promise.all([
      // Simple counts from Resume collection
      Resume.countDocuments({ jobId }),
      Resume.countDocuments({ jobId, status: "screened" }),
      Resume.countDocuments({ jobId, status: "error" }),

      // Aggregate scores for this job from Screening collection
      Screening.aggregate([
        { $match: { jobId: jobObjectId } },
        {
          $group: {
            _id: null,
            avgScore: { $avg: "$overallScore" },
            highestScore: { $max: "$overallScore" },
            lowestScore: { $min: "$overallScore" },
            totalScreenings: { $sum: 1 },
          },
        },
      ]),

      // Recommendation breakdown for this specific job
      Screening.aggregate([
        { $match: { jobId: jobObjectId } },
        {
          $group: {
            _id: "$recommendation",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),

      // Top 10 screened candidates sorted by score (descending)
      Screening.find({ jobId })
        .populate(
          "resumeId",
          "candidateName candidateEmail status uploadedBy createdAt",
        )
        .sort({ overallScore: -1 })
        .limit(10)
        .select(
          "overallScore recommendation matchedSkills missingSkills strengths weaknesses resumeId createdAt",
        ),

      // Score distribution: bucket resumes into bands (0-20, 21-40, 41-60, 61-80, 81-100)
      Screening.aggregate([
        { $match: { jobId: jobObjectId } },
        {
          $bucket: {
            groupBy: "$overallScore",
            boundaries: [0, 21, 41, 61, 81, 101],
            default: "Other",
            output: { count: { $sum: 1 } },
          },
        },
      ]),
    ]);

    // Flatten scoring aggregation result
    const scoring = screeningStats[0] || {
      avgScore: 0,
      highestScore: 0,
      lowestScore: 0,
      totalScreenings: 0,
    };

    // Convert recommendation array → object
    const recommendations = recommendationBreakdown.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    // Convert $bucket output → { "0-20": 2, "21-40": 5, ... }
    // Map bucket _id (lower boundary) to a human-readable label.
    // MongoDB only returns buckets that have at least 1 doc, so we must
    // use _id value — not array index — to get the right label.
    const bucketIdToLabel = {
      0: "0-20",
      21: "21-40",
      41: "41-60",
      61: "61-80",
      81: "81-100",
    };
    const scoreBands = scoreDistribution.reduce((acc, bucket) => {
      const label = bucketIdToLabel[bucket._id];
      if (label) acc[label] = bucket.count;
      return acc;
    }, {});

    // Pending = total resumes that are not yet screened and not errored
    const pendingResumes = totalResumes - screenedResumes - errorResumes;

    // Screening rate for this job
    const screeningRate =
      totalResumes > 0 ? Math.round((screenedResumes / totalResumes) * 100) : 0;

    response(
      res,
      200,
      {
        job: {
          id: job._id,
          title: job.title,
          company: job.company,
          status: job.status,
          type: job.type,
          skills: job.skills,
          createdAt: job.createdAt,
        },
        resumes: {
          total: totalResumes,
          screened: screenedResumes,
          pending: pendingResumes,
          errors: errorResumes,
          screeningRate,
        },
        screening: {
          totalScreenings: scoring.totalScreenings,
          avgScore: scoring.avgScore
            ? Math.round(scoring.avgScore * 10) / 10
            : 0,
          highestScore: scoring.highestScore || 0,
          lowestScore: scoring.lowestScore || 0,
          byRecommendation: recommendations,
          scoreDistribution: scoreBands,
        },
        topCandidates,
      },
      "Job stats fetched successfully",
    );
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/jobs/:jobId/analytics
// Returns pipeline funnel counts for a specific job:
//   Uploaded → Parsed → Screened → Shortlisted → Offered
//
// Accessible by: job creator, assigned hiring managers, admins.
// ─────────────────────────────────────────────────────────────────────────────
async function getJobAnalytics(req, res, next) {
  try {
    const jobId = req.params.id || req.params.jobId;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      throw new CustomError("Invalid job ID", 400);
    }

    const job = await Job.findById(jobId).select(
      "title company createdBy assignedTo",
    );
    if (!job) throw new CustomError("Job not found", 404);

    // Access check: creator, assigned HM, or admin
    const isOwner = job.createdBy?.toString() === req.user.id;
    const isAssigned = job.assignedTo?.some(
      (uid) => uid.toString() === req.user.id,
    );
    if (req.user.role !== "admin" && !isOwner && !isAssigned) {
      throw new CustomError("Access denied", 403);
    }

    const jobObjectId = new mongoose.Types.ObjectId(jobId);

    // Run all counts in parallel
    const [uploaded, parsed, screened, shortlisted, offered, rejected, onHold] =
      await Promise.all([
        Resume.countDocuments({ jobId }),
        Resume.countDocuments({
          jobId,
          status: { $in: ["parsed", "screening", "screened"] },
        }),
        Resume.countDocuments({ jobId, status: "screened" }),
        Screening.countDocuments({
          jobId: jobObjectId,
          hiringManagerDecision: "shortlisted",
        }),
        Screening.countDocuments({
          jobId: jobObjectId,
          hiringManagerDecision: "offered",
        }),
        Screening.countDocuments({
          jobId: jobObjectId,
          hiringManagerDecision: "rejected",
        }),
        Screening.countDocuments({
          jobId: jobObjectId,
          hiringManagerDecision: "on_hold",
        }),
      ]);

    // Build the ordered funnel stages with drop-off percentage from previous stage
    const stages = [
      { name: "Uploaded", count: uploaded, color: "#6366f1" },
      { name: "Parsed", count: parsed, color: "#8b5cf6" },
      { name: "Screened", count: screened, color: "#3b82f6" },
      { name: "Shortlisted", count: shortlisted, color: "#10b981" },
      { name: "Offered", count: offered, color: "#f59e0b" },
    ].map((stage, i, arr) => {
      const prev = i === 0 ? null : arr[i - 1].count;
      const drop =
        prev === null || prev === 0
          ? null
          : Math.round(((prev - stage.count) / prev) * 100);
      return { ...stage, dropFromPrevious: drop };
    });

    response(
      res,
      200,
      {
        funnel: stages,
        decisions: { shortlisted, offered, rejected, onHold },
        totals: { uploaded, parsed, screened },
      },
      "Job analytics fetched successfully",
    );
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/stats/activity
// Returns the 20 most recent actions (screenings + decisions) for the current
// user's scope, newest first. Admins see org-wide activity.
// ─────────────────────────────────────────────────────────────────────────────

async function getActivityFeed(req, res, next) {
  try {
    const isAdmin = req.user.role === "admin";
    const jobFilter = isAdmin
      ? { organizationId: req.user.organizationId }
      : req.user.role === "hiring_manager"
        ? { assignedTo: req.user.id }
        : { createdBy: new mongoose.Types.ObjectId(req.user.id) };

    // Get scoped job IDs
    const jobs = await Job.find(jobFilter).select("_id title company").lean();
    const jobMap = jobs.reduce((acc, job) => {
      acc[job._id.toString()] = job;
      return acc;
    }, {});
    const jobIds = jobs.map((j) => j._id);

    if (jobIds.length === 0) {
      return response(res, 200, { activities: [] });
    }

    // Fetch recent screenings + recent decisions in parallel
    const [recentScreenings, recentDecisions] = await Promise.all([
      Screening.find({ jobId: { $in: jobIds } })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate("resumeId", "candidateName")
        .select("jobId overallScore recommendation createdAt resumeId")
        .lean(),
      Screening.find({
        jobId: { $in: jobIds },
        hiringManagerDecision: { $ne: null },
        decidedAt: { $ne: null },
      })
        .sort({ decidedAt: -1 })
        .limit(20)
        .populate("resumeId", "candidateName")
        .populate("decidedBy", "name")
        .select("jobId hiringManagerDecision decidedAt decidedBy resumeId")
        .lean(),
    ]);

    const activities = [];

    recentScreenings.forEach((s) => {
      const job = jobMap[s.jobId?.toString()];
      activities.push({
        type: "screening_complete",
        message: `${s.resumeId?.candidateName ?? "A candidate"} was screened`,
        detail: `Score: ${s.overallScore}/100 · ${s.recommendation?.replace("_", " ")}`,
        jobTitle: job?.title ?? "Unknown Job",
        jobCompany: job?.company ?? "",
        jobId: s.jobId,
        timestamp: s.createdAt,
      });
    });

    recentDecisions.forEach((s) => {
      const job = jobMap[s.jobId?.toString()];
      activities.push({
        type: "decision_made",
        message: `${s.resumeId?.candidateName ?? "A candidate"} was ${s.hiringManagerDecision?.replace("_", " ")}`,
        detail: `Decision by ${s.decidedBy?.name ?? "Hiring Manager"}`,
        jobTitle: job?.title ?? "Unknown Job",
        jobCompany: job?.company ?? "",
        jobId: s.jobId,
        timestamp: s.decidedAt,
      });
    });

    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    response(res, 200, { activities: activities.slice(0, 20) })
  } catch (error) {
    next(error);
  }
}

module.exports = { getOverviewStats, getJobStats, getJobAnalytics, getActivityFeed };
