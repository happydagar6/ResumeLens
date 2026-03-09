// src/controllers/jobsController.js

const mongoose = require("mongoose");
const Job = require("../models/jobModel");
const { response } = require("../utils/response");
const { CustomError } = require("../utils/errors");
const { z } = require("zod");
const { analyzeJD } = require("../services/jdAnalyzerAgent");
const { detectBias } = require("../services/biasDetectionAgent");

const jobSchema = z.object({
    title: z.string().min(2),
    company: z.string().min(1),
    description: z.string().min(10),
    requirements: z.string().optional(),
    skills: z.array(z.string()).optional(),
    location: z.string().optional(),
    type: z.enum(["full-time", "part-time", "contract", "internship", "remote"]).optional(),
    salaryRange: z.string().optional(),
    status: z.enum(["open", "closed", "draft"]).optional(),
});

async function createJob(req, res, next) {
    try {
        const data = jobSchema.parse(req.body);
        const job = new Job({ ...data, createdBy: req.user?.id || null, organizationId: req.user.organizationId });
        await job.save();

        // NEW: Analyze the job description with AI (async, don't block response)
        // We save the job first, then update it later
        analyzeJD(job.description)
            .then(async (analyzed) => {
                await Job.findByIdAndUpdate(job._id, { analyzedJD: analyzed });
                console.log(`JD analyzed for job ${job._id}:`, analyzed.requiredSkills);
            })
            .catch((err) => {
                // Don't fail the job creation if AI analysis fails
                console.error(`JD analysis failed for job ${job._id}:`, err.message);
            });
        response(res, 201, { job }, "Job created successfully");
    } catch (err) {
        next(err);
    }
}

async function getJobs(req, res, next) {
    try {
        let filter;
        if (req.user.role === "admin") {
            // Admins see every job in the system
            filter = { organizationId: req.user.organizationId }; // But still filter by organization
        } else if (req.user.role === "hiring_manager") {
            // Hiring managers only see jobs they have been assigned to
            filter = { assignedTo: req.user.id };
        } else {
            // Recruiters see only the jobs they created
            filter = { createdBy: req.user.id };
        }

        // Search & Filtering
        const { search, status, type, sort } = req.query;

        if (status) filter.status = status; // Filter by job status
        if (type) filter.type = type; // Filter by job type

        if (search) {
            filter.$or = [
                {title: { $regex: search, $options: "i" }},
                {company: { $regex: search, $options: "i" }},
                {description: { $regex: search, $options: "i" }},
            ];
        }

        // Pagination
        const page = Math.max(1, parseInt(req.query.page) || 1); // Default to page 1
        const limit = Math.min(100, parseInt(req.query.limit) || 20); // Default to 20 per page, max 100
        const skip = (page - 1) * limit; // Calculate how many records to skip

        // Convert string IDs to ObjectId for use in aggregate $match
        const toOid = (id) => new mongoose.Types.ObjectId(id);
        const aggregateFilter = { ...filter };
        if (aggregateFilter.createdBy) aggregateFilter.createdBy = toOid(aggregateFilter.createdBy);
        if (aggregateFilter.assignedTo) aggregateFilter.assignedTo = toOid(aggregateFilter.assignedTo);
        if (aggregateFilter.organizationId) aggregateFilter.organizationId = toOid(aggregateFilter.organizationId);

        // Sort
        let sortOption;
        if (sort === "oldest") {
            sortOption = { createdAt: 1 };
        } else {
            sortOption = { createdAt: -1 }; // Default to newest first
        }

        const [jobs, total] = await Promise.all([
            Job.aggregate([
                { $match: aggregateFilter },
                { $sort: sortOption },
                { $skip: skip },
                { $limit: limit },
                // Join resumes to count uploads
                {
                    $lookup: {
                        from: "resumes",
                        localField: "_id",
                        foreignField: "jobId",
                        as: "_resumes",
                    },
                },
                // Join screenings to count screened + shortlisted
                {
                    $lookup: {
                        from: "screenings",
                        localField: "_id",
                        foreignField: "jobId",
                        as: "_screenings",
                    },
                },
                {
                    $addFields: {
                        resumeCount: { $size: "$_resumes" },
                        screenedCount: { $size: "$_screenings" },
                        shortlistedCount: {
                            $size: {
                                $filter: {
                                    input: "$_screenings",
                                    as: "s",
                                    cond: { $eq: ["$$s.hiringManagerDecision", "shortlisted"] },
                                },
                            },
                        },
                    },
                },
                // Strip the raw joined arrays — they're large and unnecessary on the list view
                { $project: { _resumes: 0, _screenings: 0 } },
            ]),
            Job.countDocuments(filter),
        ]);

        response(res, 200, {
            jobs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        next(err);
    }
}

async function getJobById(req, res, next) {
    try {
        // Populate assignedTo so the frontend can display assigned hiring managers
        const job = await Job.findById(req.params.id)
            .populate("assignedTo", "name email role");
        if (!job) throw new CustomError("Job not found", 404);

        // Access: creator, admin, or an assigned hiring manager
        const isOwner = job.createdBy?.toString() === req.user.id;
        const isAssigned = job.assignedTo?.some((u) => u._id.toString() === req.user.id);

        if (req.user.role !== "admin" && !isOwner && !isAssigned) {
            throw new CustomError("Access denied", 403);
        }

        response(res, 200, { job });
    } catch (err) {
        next(err);
    }
}

async function updateJob(req, res, next) {
    try {
        const data = jobSchema.partial().parse(req.body);

        // Build a filter that enforces ownership for non-admins.
        // findOneAndUpdate with this filter returns null if the job doesn't
        // exist OR if it exists but belongs to someone else — both map to 404
        // so we don't leak information about whether a job exists.
        const filter =
            req.user.role === "admin"
                ? { _id: req.params.id }
                : { _id: req.params.id, createdBy: req.user.id };

        const job = await Job.findOneAndUpdate(filter, data, {
            returnDocument: "after",
            runValidators: true,
        });
        if (!job) throw new CustomError("Job not found or access denied", 404);
        response(res, 200, { job }, "Job updated successfully");
    } catch (err) {
        next(err);
    }
}

async function deleteJob(req, res, next) {
    try {
        const filter =
            req.user.role === "admin"
                ? { _id: req.params.id }
                : { _id: req.params.id, createdBy: req.user.id };

        const job = await Job.findOneAndDelete(filter);
        if (!job) throw new CustomError("Job not found or access denied", 404);
        response(res, 200, null, "Job deleted successfully");
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/jobs/:id/assign
// Body: { userId: string, action?: "add" | "remove" }
//
// Assigns (or removes) a hiring manager to/from a job.
// Only the job creator or admin can assign.
// The target user must have role = "hiring_manager".
// ─────────────────────────────────────────────────────────────────────────────
async function assignJob(req, res, next) {
    try {
        const { userId, action = "add" } = req.body;
        if (!userId) throw new CustomError("userId is required", 400);
        if (!["add", "remove"].includes(action)) {
            throw new CustomError('action must be "add" or "remove"', 400);
        }

        // Only the job creator or admin can assign hiring managers
        const filter =
            req.user.role === "admin"
                ? { _id: req.params.id }
                : { _id: req.params.id, createdBy: req.user.id };

        const job = await Job.findOne(filter);
        if (!job) throw new CustomError("Job not found or access denied", 404);

        // Verify the user being assigned exists and is a hiring_manager
        const User = require("../models/userModel");
        const targetUser = await User.findById(userId).select("name email role");
        if (!targetUser) throw new CustomError("User not found", 404);
        if (targetUser.role !== "hiring_manager") {
            throw new CustomError("Only users with role 'hiring_manager' can be assigned", 400);
        }

        if (action === "remove") {
            job.assignedTo = job.assignedTo.filter((id) => id.toString() !== userId);
        } else {
            // Prevent duplicates
            if (!job.assignedTo.some((id) => id.toString() === userId)) {
                job.assignedTo.push(userId);
            }
        }

        await job.save();

        // Return the updated job with populated assignedTo for the frontend
        const updated = await Job.findById(job._id).populate("assignedTo", "name email role");
        response(
            res,
            200,
            { job: updated },
            action === "remove" ? "Hiring manager removed" : "Hiring manager assigned"
        );
    } catch (err) {
        next(err);
    }
}



// ─────────────────────────────────────────────────────────────────────────────
// POST /api/jobs/:id/analyze-bias
//
// Runs the bias detection AI on a job's description + requirements.
// Stores the result in job.biasFlags. Idempotent — calling it again re-analyzes
// and overwrites the previous result (useful after editing the JD).
//
// Accessible by: recruiter (job creator) and admin only.
// ─────────────────────────────────────────────────────────────────────────────

async function analyzeBias(req, res, next) {
    try {
        // 1. Load the job - same ownership filter pattern as updateJob
        const filter = req.user.role === "admin"
        ? { _id: req.params.id }
        : { _id: req.params.id, createdBy: req.user.id };

        const job = await Job.findOne(filter);
        if (!job) throw new CustomError("Job not found or access denied", 404);

        // 2. Build the text to analyze - combine description + requirements
        // This ensures we catch bias in both sections
        const jobText = [
            job.description,
            job.requirements ? `\n\nRequirements:\n${job.requirements}` : "",
        ].join("").trim(); // Avoid extra whitespace if requirements is missing

        if (!jobText) throw new CustomError("Job description and requirements are both empty", 400);
        console.log(`[BiasDetection] Analyzing job ${job._id}: ${job.title}`);

        // 3. Run the bias detection agent
        const biasResult = await detectBias(jobText);

        // 4. Persist to MongoDB - add timestamp so UI can show "last analyzed"
        const biasFlags = {
            // Why spread operator? Because biasResult may contain extra fields like summary that we also want to store
            ...biasResult,
            analyzedAt: new Date(), // Timestamp for when the analysis was done
        };

        await Job.findByIdAndUpdate(job._id, { biasFlags });
        console.log(
            `[BiasDetection] Job ${job._id} - Score: ${biasResult.biasScore}, Flags: ${biasResult.flagCount}`
        )
        response(res, 200, { biasFlags }, "Bias analysis completed and saved");
    } catch (error) {
        console.error(`[BiasDetection] Error analyzing job ${req.params.id}:`, error);
        next(error);
    }
}

module.exports = { createJob, getJobs, getJobById, updateJob, deleteJob, assignJob, analyzeBias };
