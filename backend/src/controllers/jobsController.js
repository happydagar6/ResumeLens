// src/controllers/jobsController.js

const Job = require("../models/jobModel");
const { response } = require("../utils/response");
const { CustomError } = require("../utils/errors");
const { z } = require("zod");
const { analyzeJD } = require("../services/jdAnalyzerAgent");

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
        const job = new Job({ ...data, createdBy: req.user?.id || null });
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
        // Admins see every job in the system.
        // Everyone else only sees jobs THEY created.
        const filter = req.user.role === "admin" ? {} : { createdBy: req.user.id };
        const jobs = await Job.find(filter).sort({ createdAt: -1 });
        response(res, 200, { jobs });
    } catch (err) {
        next(err);
    }
}

async function getJobById(req, res, next) {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) throw new CustomError("Job not found", 404);

        // Ownership check: only the creator or an admin can view this job
        if (req.user.role !== "admin" && job.createdBy?.toString() !== req.user.id) {
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
            new: true,
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

module.exports = { createJob, getJobs, getJobById, updateJob, deleteJob };
