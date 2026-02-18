// src/controllers/resumeController.js

const Resume = require("../models/resumeModel");
const Job = require("../models/jobModel");
const { parsePDF } = require("../services/pdfParserService");
const { extractEntities } = require("../services/entityExtractorAgent"); // NEW
const { response } = require("../utils/response");
const { CustomError } = require("../utils/errors");


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

        // Step 1: Parse PDF text
        let parsedText = "";
        try {
            
        } catch (error) {
            
        }
    } catch (error) {
        
    }
}