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
    const jobFilter = isAdmin
      ? (req.user.organizationId ? { organizationId: req.user.organizationId } : {})
      : { createdBy: req.user.id };

    // Resolve user's / organization's accessible job IDs for strictly scoped analytics
    const scopedJobs = await Job.find(jobFilter).select("_id");
    const jobIds = scopedJobs.map((j) => j._id);
    const resumeFilter = { jobId: { $in: jobIds } };
    const screeningMatch = { jobId: { $in: jobIds } };

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
      Job.countDocuments(jobFilter), // Total number of jobs created by the user
      Job.countDocuments({ ...jobFilter, status: "open" }), // Total number of open jobs created by the user
      Job.countDocuments({ ...jobFilter, status: "closed" }), // Total number of closed jobs created by the user

      // Resume counts — scoped via jobIds
      Resume.countDocuments(resumeFilter), // Total number of resumes uploaded by the user
      Resume.countDocuments({ ...resumeFilter, status: "screened" }), // Total number of screened resumes by the user
      Resume.countDocuments({ ...resumeFilter, status: "error" }), // Total number of error resumes by the user

      // Scoring stats — avg, max, min across user's screenings
      Screening.aggregate([
        { $match: screeningMatch }, // Match the screenings based on the user's job IDs
        {
          $group: { // Group the screenings by overallScore to calculate avg, max, min, and totalScreenings
            _id: null, // Group all screenings together
            avgScore: { $avg: "$overallScore" }, // Calculate the average overallScore
            highestScore: { $max: "$overallScore" }, // Calculate the highest overallScore
            lowestScore: { $min: "$overallScore" }, // Calculate the lowest overallScore
            totalScreenings: { $sum: 1 }, // Calculate the total number of screenings
          },
        },
      ]),

      // How many screenings per recommendation category — user scoped
      Screening.aggregate([
        { $match: screeningMatch }, // Match the screenings based on the user's job IDs
        {
          $group: { // Group the screenings by recommendation to calculate avg, max, min, and totalScreenings
            _id: "$recommendation", // Group all screenings together
            count: { $sum: 1 }, // Calculate the total number of screenings
          },
        },
        { $sort: { count: -1 } }, // Sort the screenings by count in descending order
      ]),

      // Resume pipeline breakdown (all statuses) — user scoped
      Resume.aggregate([
        { $match: resumeFilter }, // Match the resumes based on the user's job IDs
        {
          $group: { // Group the resumes by status to calculate avg, max, min, and totalScreenings
            _id: "$status", // Group all resumes together
            count: { $sum: 1 }, // Calculate the total number of resumes
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
    }; // Scoring stats

    // Convert recommendation array → { strong_yes: 4, yes: 10, ... }
    const recommendations = recommendationBreakdown.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}); // Recommendation breakdown

    // Convert resume status array → { uploaded: 2, parsed: 5, screened: 20, error: 1, ... }
    const resumesByStatus = resumeStatusBreakdown.reduce((acc, item) => {
      acc[item._id] = item.count; // Convert resume status array to object
      return acc; // Return the object
    }, {}); // Resume status breakdown

    // Screening rate = % of resumes that have been screened
    const screeningRate =
      totalResumes > 0 ? Math.round((totalScreened / totalResumes) * 100) : 0; // Calculate the screening rate

    response(
      res,
      200,
      {
        jobs: {
          total: totalJobs, // Total number of jobs
          open: openJobs, // Open jobs
          closed: closedJobs, // Closed jobs
          draft: totalJobs - openJobs - closedJobs, // Draft jobs
        },
        resumes: {
          total: totalResumes, // Total number of resumes
          screened: totalScreened, // Screened resumes
          errors: totalErrors, // Error resumes
          pending: totalResumes - totalScreened - totalErrors, // Pending resumes
          screeningRate, // % of resumes successfully screened
          byStatus: resumesByStatus, // Resume status breakdown
        },
        screening: {
          totalScreenings: scoring.totalScreenings, // Total number of screenings
          avgScore: scoring.avgScore
            ? Math.round(scoring.avgScore * 10) / 10 // 1 decimal place
            : 0,
          highestScore: scoring.highestScore || 0, // Highest score
          lowestScore: scoring.lowestScore || 0, // Lowest score
          byRecommendation: recommendations, // Recommendation breakdown
        },
        recentJobs, // Recent jobs
      },
      "Overview stats fetched successfully", // success message
    ); // call response function
  } catch (err) {
    next(err); // pass error to the error handling middleware
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
    const { jobId } = req.params; // Get job ID from request parameters

    // Validate ObjectId format before hitting DB
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      throw new CustomError("Invalid job ID", 400); // Invalid job ID error
    }

    // Confirm the job exists
    const job = await Job.findById(jobId).select(
      "title company status type description skills createdAt createdBy organizationId",
    );
    if (!job) throw new CustomError("Job not found", 404);

    // Ownership check: only the job creator or organization admin can view its stats
    const isOwner = job.createdBy?.toString() === req.user.id;
    const isOrgAdmin = req.user.role === "admin" && (
      !job.organizationId || !req.user.organizationId ||
      job.organizationId.toString() === req.user.organizationId.toString()
    );
    if (!isOrgAdmin && !isOwner) {
      throw new CustomError("Access denied", 403);
    }

    const jobObjectId = new mongoose.Types.ObjectId(jobId);

    // Run all aggregations in parallel
    // Why we used Promise.all here and how do i explain it in interview that why i used this and what it will do here ?
    // We used Promise.all to run all the aggregations in parallel instead of running them sequentially. This is because all the aggregations are independent of each other and can be run in parallel to improve performance. If we had run them sequentially, it would have taken longer to get all the data. 
    // Explanation:
    // In a real interview scenario, I would explain it like this:
    // "I used Promise.all here because all the aggregations I'm running are independent of 
    // each other. I need to get the total number of resumes, the number of screened resumes, 
    // the number of error resumes, the average score, the highest score, the lowest score, 
    // the number of recommendations, the top 10 candidates, and the score distribution. These 
    // are all separate queries that don't depend on each other, so I can run them in parallel 
    // to get all the data at once. This improves performance because the total time taken will 
    // be the time of the slowest query, rather than the sum of all query times."
    const [
      totalResumes,
      screenedResumes,
      errorResumes,
      screeningStats,
      recommendationBreakdown,
      topCandidates,
      scoreDistribution,
    ] = await Promise.all([ // array of promises to be executed in parallel
      // Simple counts from Resume collection
      Resume.countDocuments({ jobId }), // total resumes
      Resume.countDocuments({ jobId, status: "screened" }), // screened resumes
      Resume.countDocuments({ jobId, status: "error" }), // error resumes

      // Aggregate scores for this job from Screening collection
      Screening.aggregate([
        { $match: { jobId: jobObjectId } }, // match job id
        {
          $group: {
            _id: null, // group by null
            avgScore: { $avg: "$overallScore" }, // calculate average score
            highestScore: { $max: "$overallScore" }, // calculate highest score
            lowestScore: { $min: "$overallScore" }, // calculate lowest score
            totalScreenings: { $sum: 1 }, // count total screenings
          },
        },
      ]),

      // Recommendation breakdown for this specific job
      Screening.aggregate([
        { $match: { jobId: jobObjectId } }, // match job id
        {
          $group: {
            _id: "$recommendation", // group by recommendation
            count: { $sum: 1 }, // count recommendations
          },
        },
        { $sort: { count: -1 } }, // sort by count in descending osrder
      ]),

      // Top 10 screened candidates sorted by score (descending)
      Screening.find({ jobId }) // find screenings for this job
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
    const scoring = screeningStats[0] || { // if no screenings, return default values
      avgScore: 0, // default average score
      highestScore: 0, // default highest score
      lowestScore: 0, // default lowest score
      totalScreenings: 0, // default total screenings
    }; // end of scoring object

    // Convert recommendation array → object
    const recommendations = recommendationBreakdown.reduce((acc, item) => {
      acc[item._id] = item.count; // add recommendation and count to object
      return acc; // return object
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
    }; // mapping of bucket _id to label

    const scoreBands = scoreDistribution.reduce((acc, bucket) => {
      const label = bucketIdToLabel[bucket._id]; // get label from bucket _id
      if (label) acc[label] = bucket.count; // add bucket and count to object
      return acc; // return object
    }, {}); // end of score distribution object

    // Pending = total resumes that are not yet screened and not errored
    const pendingResumes = totalResumes - screenedResumes - errorResumes; // pending = total - screened - error

    // Screening rate for this job
    const screeningRate =
      totalResumes > 0 ? Math.round((screenedResumes / totalResumes) * 100) : 0; // screening rate = (screened / total) * 100

    response(
      res,
      200,
      {
        job: {
          id: job._id, // job id
          title: job.title, // job title
          company: job.company, // company name
          status: job.status, // job status
          type: job.type, // job type
          skills: job.skills, // job skills
          createdAt: job.createdAt, // job creation date
        }, // end of job object
        resumes: {
          total: totalResumes, // total resumes
          screened: screenedResumes, // screened resumes
          pending: pendingResumes, // pending resumes
          errors: errorResumes, // error resumes
          screeningRate, // screening rate
        }, // end of resumes object
        screening: {
          totalScreenings: scoring.totalScreenings, // total screenings
          avgScore: scoring.avgScore
            ? Math.round(scoring.avgScore * 10) / 10
            : 0, // average score
          highestScore: scoring.highestScore || 0, // highest score
          lowestScore: scoring.lowestScore || 0, // lowest score
          byRecommendation: recommendations, // recommendation breakdown
          scoreDistribution: scoreBands, // score distribution
        }, // end of screening object
        topCandidates, // top candidates
      },
      "Job stats fetched successfully",
    );
  } catch (err) { // catch any errors
    next(err); // pass error to error handling middleware
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
    const jobId = req.params.id || req.params.jobId; // get job id from request parameters

    if (!mongoose.Types.ObjectId.isValid(jobId)) { // check if job id is valid
      throw new CustomError("Invalid job ID", 400); // throw error if job id is invalid
    }

    const job = await Job.findById(jobId).select(
      "title company createdBy assignedTo", // select job details
    );
    if (!job) throw new CustomError("Job not found", 404); // throw error if job not found

    // Access check: creator, assigned HM, or admin
    const isOwner = job.createdBy?.toString() === req.user.id; // check if user is creator
    const isAssigned = job.assignedTo?.some(
      (uid) => uid.toString() === req.user.id, // check if user is assigned
    );
    if (req.user.role !== "admin" && !isOwner && !isAssigned) { // check if user is admin
      throw new CustomError("Access denied", 403); // throw error if access denied
    }

    const jobObjectId = new mongoose.Types.ObjectId(jobId); // convert job id to object id

    // Run all counts in parallel
    // Why we used Promise.all here ?
    // We use Promise.all to execute multiple database queries in parallel instead of sequentially.
    // This significantly speeds up the response time, especially when there are many queries to run.
    const [uploaded, parsed, screened, shortlisted, offered, rejected, onHold] =
      await Promise.all([
        Resume.countDocuments({ jobId }), // count uploaded resumes
        Resume.countDocuments({
          jobId,
          status: { $in: ["parsed", "screening", "screened"] }, // count resumes that are parsed, screening or screened
        }),
        Resume.countDocuments({ jobId, status: "screened" }), // count screened resumes
        Screening.countDocuments({
          jobId: jobObjectId,
          hiringManagerDecision: "shortlisted", // count shortlisted resumes
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

    const User = require("../models/userModel");
    const user = await User.findById(req.user.id).select("activityClearedAt");
    const activityClearedAt = user?.activityClearedAt || new Date(0);

    // Fetch recent screenings + recent decisions in parallel (filtered by activityClearedAt)
    const [recentScreenings, recentDecisions] = await Promise.all([
      Screening.find({ jobId: { $in: jobIds }, createdAt: { $gt: activityClearedAt } })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate("resumeId", "candidateName")
        .select("jobId overallScore recommendation createdAt resumeId")
        .lean(),
      Screening.find({
        jobId: { $in: jobIds },
        hiringManagerDecision: { $ne: null },
        decidedAt: { $gt: activityClearedAt },
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

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/stats/activity
// Sets activityClearedAt on the user so old activity is hidden
// ─────────────────────────────────────────────────────────────────────────────
async function clearActivityFeed(req, res, next) {
  try {
    const User = require("../models/userModel");
    await User.findByIdAndUpdate(req.user.id, { activityClearedAt: Date.now() });
    response(res, 200, null, "Activity feed cleared");
  } catch (error) {
    next(error);
  }
}

module.exports = { getOverviewStats, getJobStats, getJobAnalytics, getActivityFeed, clearActivityFeed };
