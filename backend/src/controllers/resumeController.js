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
        if (!req.file) throw new CustomError("No file uploaded", 400); // if no file is uploaded

        const { jobId, candidateName, candidateEmail } = req.body;
        if (!jobId || !candidateName) {
            throw new CustomError("jobId and candidateName are required", 400); // if jobId or candidateName is not provided
        }

        // Verify job exists
        const job = await Job.findById(jobId); // find the job by ID
        if (!job) throw new CustomError("Job not found", 404); // if job not found

        // Ownership check: only the job owner or admin can upload resumes to this job
        if (req.user.role !== "admin" && job.createdBy?.toString() !== req.user.id) {
            throw new CustomError("Access denied — you do not own this job", 403); // if access is denied
        }

        // Step 1: Parse PDF text DIRECTLY from memory buffer
        let parsedText = ""; // parse pdf text from memory buffer
        try {
            parsedText = await parsePDF(req.file.buffer); // parse pdf
        } catch (parseErr) {
            console.error("PDF parse error:", parseErr.message); // if pdf parse error
        }

        // Step 2: Extract entities from parsed text
        let extractedEntities = null; // extract entities from parsed text
        if (parsedText) { // check if parsed text is not empty
            try {
                extractedEntities = await extractEntities(parsedText); // extract entities
            } catch (extractErr) {
                // Don't fail the upload if entity extraction fails
                console.error("Entity extraction error:", extractErr.message);
            }
        }

        // Step 2.5: Duplicate Candidate Detection
        let isPastApplicant = false; // check if candidate is a past applicant
        
        // Use the email provided in the form OR the one extracted by the AI
        const emailToCheck = candidateEmail || (extractedEntities && extractedEntities.contactInfo?.email); // check for email in either the form or extracted entities
        
        if (emailToCheck) {
            // Look for any existing resume with this exact email
            const existingResumes = await Resume.find({ 
                candidateEmail: emailToCheck.toLowerCase() // find existing resume with the same email
            });

            if (existingResumes.length > 0) {
                // Check if they applied to THIS exact job already
                const alreadyInThisJob = existingResumes.some(
                    (res) => res.jobId.toString() === jobId // check if the same job id is present
                );

                if (alreadyInThisJob) {
                    throw new CustomError(`Duplicate Error: A candidate with email ${emailToCheck} has already been uploaded for this job.`, 409); // if the same candidate is uploaded for the same job
                } else {
                    // They applied to a DIFFERENT job previously. Flag them!
                    isPastApplicant = true; // flag the candidate as a past applicant
                }
            }
        }

        // Step 3: Upload the PDF buffer to Cloudinary
        const uploadToCloudinary = new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: "recruitai_resumes", // upload to the specified folder in Cloudinary
                    resource_type: "raw", // Required for PDFs
                    format: "pdf",
                },
                (error, result) => {
                    if (error) reject(error); // if there is an error, reject the promise
                    else resolve(result);
                }
            );
            streamifier.createReadStream(req.file.buffer).pipe(stream);
        });

        const cloudData = await uploadToCloudinary; // upload the file to Cloudinary

        // Step 4: Save resume to database with the Cloudinary URL
        const resume = new Resume({
            candidateName, // store the candidate name
            candidateEmail: emailToCheck || "", // store the candidate email
            isPastApplicant,
            fileName: req.file.originalname, // store the file name
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
        const { jobId } = req.params; // get the job ID from the request parameters

        // Verify the job exists; allow access to owner, admin, or assigned hiring manager
        const job = await Job.findById(jobId); // find the job by ID
        if (!job) throw new CustomError("Job not found", 404); // if job not found

        const isOwner = job.createdBy?.toString() === req.user.id; // check if the user is the owner
        const isAssigned = job.assignedTo?.some((uid) => uid.toString() === req.user.id); // check if the user is assigned to the job
        if (req.user.role !== "admin" && !isOwner && !isAssigned) { // if the user is not the owner, not assigned, and not an admin
            throw new CustomError("Access denied", 403);
        }

        const resumes = await Resume.find({ jobId }).sort({ createdAt: -1 }); // find all resumes for the job and sort them by creation date in descending order
        response(res, 200, { resumes }); // send the resumes to the client
    } catch (err) {
        next(err); // pass the error to the error handling middleware
    }
}

// Get a single resume by ID
async function getResumeById(req, res, next) {
    try {
        const resume = await Resume.findById(req.params.id); // get the resume by ID
        if (!resume) throw new CustomError("Resume not found", 404); // if resume not found

        // Verify the parent job is accessible by this user
        const job = await Job.findById(resume.jobId); // find the job by ID
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
        const resume = await Resume.findById(req.params.id); // get the resume by ID
        if (!resume) throw new CustomError("Resume not found", 404); // if resume not found

        // Verify the parent job is accessible by this user
        const job = await Job.findById(resume.jobId); // find the job by ID
        if (job && req.user.role !== "admin" && job.createdBy?.toString() !== req.user.id) { // if the user is not the owner, not assigned, and not an admin
            throw new CustomError("Access denied", 403); // if access is denied
        }

        // Cascade delete: Remove the physical file from Cloudinary
        if (resume.filePath) { // if the resume has a file path
            await deleteFromCloudinary(resume.filePath); // delete the file from Cloudinary
        }

        // Cascade delete: Remove associated AI screening results
        await Screening.deleteOne({ resumeId: resume._id }); // delete the screening results

        // Cascade delete: Remove any associated background processing jobs
        await ProcessingJob.deleteMany({ resumeId: resume._id }); // delete the processing jobs

        // Finally, delete the resume document itself
        await resume.deleteOne();
        
        response(res, 200, null, "Resume and associated data deleted successfully");
    } catch (err) {
        next(err);
    }
}

module.exports = { uploadResume, getResumesByJob, getResumeById, deleteResume };