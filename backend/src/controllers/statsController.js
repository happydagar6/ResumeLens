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
// Returns site-wide aggregate statistics for the dashboard.
// ─────────────────────────────────────────────────────────────────────────────
async function getOverviewStats(req, res, next) {
    try {
        // Run all independent DB queries in parallel for performance
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
            // Job counts
            Job.countDocuments(),
            Job.countDocuments({ status: "open" }),
            Job.countDocuments({ status: "closed" }),

            // Resume counts
            Resume.countDocuments(),
            Resume.countDocuments({ status: "screened" }),
            Resume.countDocuments({ status: "error" }),

            // Scoring stats — avg, max, min across all screenings
            Screening.aggregate([
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

            // How many screenings per recommendation category
            Screening.aggregate([
                {
                    $group: {
                        _id: "$recommendation",
                        count: { $sum: 1 },
                    },
                },
                { $sort: { count: -1 } },
            ]),

            // Resume pipeline breakdown (all statuses)
            Resume.aggregate([
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 },
                    },
                },
            ]),

            // 5 most recently created jobs for "Recent Activity" widget
            Job.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .select("title company status type createdAt"),
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
            totalResumes > 0
                ? Math.round((totalScreened / totalResumes) * 100)
                : 0;

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
                    screeningRate,          // % of resumes successfully screened
                    byStatus: resumesByStatus,
                },
                screening: {
                    totalScreenings: scoring.totalScreenings,
                    avgScore: scoring.avgScore
                        ? Math.round(scoring.avgScore * 10) / 10  // 1 decimal place
                        : 0,
                    highestScore: scoring.highestScore || 0,
                    lowestScore: scoring.lowestScore || 0,
                    byRecommendation: recommendations,
                },
                recentJobs,
            },
            "Overview stats fetched successfully"
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
            "title company status type description skills createdAt"
        );
        if (!job) throw new CustomError("Job not found", 404);

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
                    "candidateName candidateEmail status uploadedBy createdAt"
                )
                .sort({ overallScore: -1 })
                .limit(10)
                .select(
                    "overallScore recommendation matchedSkills missingSkills strengths weaknesses resumeId createdAt"
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
        const bucketIdToLabel = { 0: "0-20", 21: "21-40", 41: "41-60", 61: "61-80", 81: "81-100" };
        const scoreBands = scoreDistribution.reduce((acc, bucket) => {
            const label = bucketIdToLabel[bucket._id];
            if (label) acc[label] = bucket.count;
            return acc;
        }, {});

        // Pending = total resumes that are not yet screened and not errored
        const pendingResumes = totalResumes - screenedResumes - errorResumes;

        // Screening rate for this job
        const screeningRate =
            totalResumes > 0
                ? Math.round((screenedResumes / totalResumes) * 100)
                : 0;

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
            "Job stats fetched successfully"
        );
    } catch (err) {
        next(err);
    }
}

module.exports = { getOverviewStats, getJobStats };
