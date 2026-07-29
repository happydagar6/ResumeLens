// src/controllers/resumeController.js

const { createAuditLog } = require("../utils/auditLogModel")
const Resume = require("../models/resumeModel");
const Job = require("../models/jobModel");
const Screening = require("../models/screeningModel");
const ProcessingJob = require("../models/processingJobModel");
const { parsePDF } = require("../services/pdfParserService");
const { extractEntities } = require("../services/entityExtractorAgent"); // NEW
const { response } = require("../utils/response");
const { CustomError } = require("../utils/errors");
const { cloudinary, deleteFromCloudinary } = require("../config/cloudinary");
const streamifier = require("streamifier");


async function uploadResume(req, res, next) {
    try {
        if (!req.file) throw new CustomError("No file uploaded", 400);

        const { jobId, candidateName, candidateEmail } = req.body;
        if (!jobId || !candidateName) {
            throw new CustomError("jobId and candidateName are required", 400);
        }

        // Verify job exists
        const job = await Job.findById(jobId);
        if (!job) throw new CustomError("Job not found", 404);

        // Ownership check: only the job owner or admin can upload resumes to this job
        if (req.user.role !== "admin" && job.createdBy?.toString() !== req.user.id) {
            throw new CustomError("Access denied — you do not own this job", 403);
        }

        // Step 1: Parse PDF text DIRECTLY from memory buffer
        let parsedText = "";
        try {
            parsedText = await parsePDF(req.file.buffer);
        } catch (parseErr) {
            console.error("PDF parse error:", parseErr.message);
        }

        // Step 2: Extract entities from parsed text
        let extractedEntities = null;
        if (parsedText) {
            try {
                extractedEntities = await extractEntities(parsedText);
            } catch (extractErr) {
                // Don't fail the upload if entity extraction fails
                console.error("Entity extraction error:", extractErr.message);
            }
        }

        // Step 3: Upload the PDF buffer to Cloudinary
        const uploadToCloudinary = new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: "recruitai_resumes",
                    resource_type: "raw", // Required for PDFs
                    format: "pdf",
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            streamifier.createReadStream(req.file.buffer).pipe(stream);
        });

        const cloudData = await uploadToCloudinary;

        // Step 4: Save resume to database with the Cloudinary URL
        const resume = new Resume({
            candidateName,
            candidateEmail: candidateEmail || "",
            fileName: req.file.originalname,
            filePath: cloudData.secure_url, // Save the permanent cloud URL instead of local path!
            parsedText,
            extractedEntities, 
            jobId,
            uploadedBy: req.user?.id || null,
            status: parsedText ? "parsed" : "uploaded",
        });
        await resume.save(); // save the resume to the database

        response(res, 201, { resume }, "Resume uploaded successfully");
    } catch (err) {
        next(err);
    }
}

// Get all resumes for a specific job
async function getResumesByJob(req, res, next) {
    try {
        const { jobId } = req.params;

        // Verify the job exists; allow access to owner, admin, or assigned hiring manager
        const job = await Job.findById(jobId);
        if (!job) throw new CustomError("Job not found", 404);

        const isOwner = job.createdBy?.toString() === req.user.id;
        const isAssigned = job.assignedTo?.some((uid) => uid.toString() === req.user.id);
        if (req.user.role !== "admin" && !isOwner && !isAssigned) {
            throw new CustomError("Access denied", 403);
        }

        const resumes = await Resume.find({ jobId }).sort({ createdAt: -1 });
        response(res, 200, { resumes });
    } catch (err) {
        next(err);
    }
}

// Get a single resume by ID
async function getResumeById(req, res, next) {
    try {
        const resume = await Resume.findById(req.params.id);
        if (!resume) throw new CustomError("Resume not found", 404);

        // Verify the parent job is accessible by this user
        const job = await Job.findById(resume.jobId);
        if (job && req.user.role !== "admin" && job.createdBy?.toString() !== req.user.id) {
            throw new CustomError("Access denied", 403);
        }

        response(res, 200, { resume });
    } catch (err) {
        next(err);
    }
}

// Delete a resume by ID
async function deleteResume(req, res, next) {
    try {
        const resume = await Resume.findById(req.params.id);
        if (!resume) throw new CustomError("Resume not found", 404);

        // Verify the parent job is accessible by this user
        const job = await Job.findById(resume.jobId);
        if (job && req.user.role !== "admin" && job.createdBy?.toString() !== req.user.id) {
            throw new CustomError("Access denied", 403);
        }

        // Cascade delete: Remove the physical file from Cloudinary
        if (resume.filePath) {
            await deleteFromCloudinary(resume.filePath);
        }

        // Cascade delete: Remove associated AI screening results
        await Screening.deleteOne({ resumeId: resume._id });

        // Cascade delete: Remove any associated background processing jobs
        await ProcessingJob.deleteMany({ resumeId: resume._id });

        // Finally, delete the resume document itself
        await resume.deleteOne();
        
        response(res, 200, null, "Resume and associated data deleted successfully");
    } catch (err) {
        next(err);
    }
}

module.exports = { uploadResume, getResumesByJob, getResumeById, deleteResume };