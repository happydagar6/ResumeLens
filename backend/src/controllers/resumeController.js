// src/controllers/resumeController.js

const { createAuditLog } = require("../utils/auditLogModel");
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
    if (
      req.user.role !== "admin" &&
      job.createdBy?.toString() !== req.user.id
    ) {
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
    if (parsedText) {
      // check if parsed text is not empty
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
    const emailToCheck =
      candidateEmail ||
      (extractedEntities && extractedEntities.contactInfo?.email); // check for email in either the form or extracted entities

    if (emailToCheck) {
      // Look for any existing resume with this exact email
      const existingResumes = await Resume.find({
        candidateEmail: emailToCheck.toLowerCase(), // find existing resume with the same email
      });

      if (existingResumes.length > 0) {
        // Check if they applied to THIS exact job already
        const alreadyInThisJob = existingResumes.some(
          (res) => res.jobId.toString() === jobId, // check if the same job id is present
        );

        if (alreadyInThisJob) {
          throw new CustomError(
            `Duplicate Error: A candidate with email ${emailToCheck} has already been uploaded for this job.`,
            409,
          ); // if the same candidate is uploaded for the same job
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
          if (error)
            reject(error); // if there is an error, reject the promise
          else resolve(result);
        },
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
    const isAssigned = job.assignedTo?.some(
      (uid) => uid.toString() === req.user.id,
    ); // check if the user is assigned to the job
    if (req.user.role !== "admin" && !isOwner && !isAssigned) {
      // if the user is not the owner, not assigned, and not an admin
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
    if (
      job &&
      req.user.role !== "admin" &&
      job.createdBy?.toString() !== req.user.id
    ) {
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
    if (
      job &&
      req.user.role !== "admin" &&
      job.createdBy?.toString() !== req.user.id
    ) {
      // if the user is not the owner, not assigned, and not an admin
      throw new CustomError("Access denied", 403); // if access is denied
    }

    // Cascade delete: Remove the physical file from Cloudinary
    if (resume.filePath) {
      // if the resume has a file path
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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/resumes/candidates
// Query: { search?, jobId?, stage?, minScore?, page?, limit? }
//
// Centralized Talent Pool directory: Returns all candidates across all jobs
// accessible to this recruiter/admin, unified with their AI screening scores.
// ─────────────────────────────────────────────────────────────────────────────

async function getCandidatesDirectory(req, res, next) {
  try {
    const {
      search = "",
      jobId = "",
      stage = "all",
      minScore = 0,
      limit = 1000,
      page = 1,
    } = req.query;

    // 1. Role-based job access scope
    // Non-admin recruiters can only see candidates for jobs they created or are assigned to.
    // Admins have global visibility across all jobs in the company.
    let jobQuery = {};
    if (req.user.role !== "admin") {
      jobQuery = {
        $or: [{ createdBy: req.user.id }, { assignedTo: req.user.id }],
      };
    }

    const accessibleJobs = await Job.find(jobQuery).select(
      "_id title company department location",
    );
    const accessibleJobIds = accessibleJobs.map((j) => j._id);

    // If recruiter has no accessible jobs, return an empty candidate list immediately
    if (accessibleJobIds.length === 0) {
      return response(res, 200, {
        candidates: [],
        pagination: {
          total: 0,
          page: Number(page),
          pages: 0,
          limit: Number(limit),
        },
        jobs: [],
      });
    }

    // 2. Build Resume query filter
    // If a specific jobId is selected from the dropdown, filter by that job;
    // otherwise restrict to all jobs accessible to this recruiter.
    const resumeFilter = {
      jobId: jobId && jobId !== "all" ? jobId : { $in: accessibleJobIds },
    };

    // Text search filter: case-insensitive regex match across Candidate Name, Email, or Extracted Skills
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      resumeFilter.$or = [
        { candidateName: regex },
        { candidateEmail: regex },
        { "extractedEntities.skills": regex },
      ];
    }

    // 3. Fetch resumes matching the filter, populated with basic job details, sorted newest first
    const resumes = await Resume.find(resumeFilter)
      .populate("jobId", "title company department location")
      .sort({ createdAt: -1 });

    // 4. Batch fetch associated Screenings in a single query using $in to avoid N+1 database roundtrips
    const resumeIds = resumes.map((r) => r._id);
    const screenings = await Screening.find({
      resumeId: { $in: resumeIds },
    }).select(
      "resumeId overallScore recommendation hiringManagerDecision matchedSkills missingSkills",
    );

    // 5. Build an in-memory Map (key: resumeId string -> value: screening doc)
    // Provides instant O(1) lookup time when merging screening data with resumes below
    const screeningMap = new Map();
    screenings.forEach((s) => {

      if (s.resumeId) {
        screeningMap.set(s.resumeId.toString(), s);
      }
    });

    // 6. Merge Resume data with Screening results & determine the candidate's hiring stage
    let candidates = resumes.map((r) => {
      const s = screeningMap.get(r._id.toString()) || null;

      // Determine hiring stage:
      // - "applied": resume exists but has not been screened yet (no screening record)
      // - "in_review": screening is complete but hiring manager hasn't made a final decision yet
      // - "shortlisted" | "offered" | "rejected": explicit decision set by recruiter/hiring manager
      let currentStage = "applied";
      if (s) {
        if (s.hiringManagerDecision) {
          currentStage = s.hiringManagerDecision;
        } else {
          currentStage = "in_review";
        }
      }

      return {
        _id: r._id,
        candidateName: r.candidateName,
        candidateEmail: r.candidateEmail,
        isPastApplicant: r.isPastApplicant || false,
        createdAt: r.createdAt,
        job: r.jobId,
        status: r.status,
        extractedSkills: r.extractedEntities?.skills || [],
        screening: s
          ? {
              _id: s._id,
              overallScore: s.overallScore,
              recommendation: s.recommendation,
              hiringManagerDecision: s.hiringManagerDecision,
              matchedSkills: s.matchedSkills || [],
              missingSkills: s.missingSkills || [],
            }
          : null,
        currentStage,
      };
    });

    // 7. In-memory filter by candidate hiring stage (applied, in_review, shortlisted, offered, rejected)
    if (stage && stage !== "all") {
      candidates = candidates.filter((c) => c.currentStage === stage);
    }

    // 8. In-memory filter by minimum AI screening match score (0 to 100)
    const parsedMinScore = parseInt(minScore, 10) || 0;
    if (parsedMinScore > 0) {
      candidates = candidates.filter(
        (c) => c.screening && c.screening.overallScore >= parsedMinScore,
      );
    }

    // 9. Defensive Pagination Logic:
    // - parseInt(..., 10) converts string query params from HTTP request into numbers (base 10).
    // - || fallback provides defaults (page: 1, limit: 10) if parameter is missing, NaN, or 0.
    // - Math.max(1, ...) guarantees the value is at least 1, preventing negative or 0 values
    //   which would break array indexing (e.g. negative skip in slice counts backwards from array end).
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, parseInt(limit, 10) || 10);

    // - skip: calculates how many candidate records to bypass before taking records for the current page.
    //   Formula: (page - 1) * limit (e.g., Page 1: (1-1)*10 = skip 0; Page 2: (2-1)*10 = skip 10).
    const skip = (parsedPage - 1) * parsedLimit;

    const total = candidates.length;
    // - slice(skip, skip + limit): extracts only the items belonging to the requested page window.
    const paginatedCandidates = candidates.slice(skip, skip + parsedLimit);
    // - Math.ceil(total / limit): calculates total number of pages, rounding up any leftover items to a new page.
    const totalPages = Math.ceil(total / parsedLimit);

    // Return paginated candidates, pagination metadata for UI controls,
    // and accessibleJobs so the frontend dropdown populates in one single request.
    response(res, 200, {
      candidates: paginatedCandidates,
      pagination: {
        total,
        page: parsedPage,
        pages: totalPages,
        limit: parsedLimit,
      },
      jobs: accessibleJobs,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  uploadResume,
  getResumesByJob,
  getResumeById,
  deleteResume,
  getCandidatesDirectory,
};
