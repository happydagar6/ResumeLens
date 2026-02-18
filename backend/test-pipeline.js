// test-pipeline.js — Tests the entire RecruitAI pipeline
// Run: node test-pipeline.js
// Requires: backend server running on port 5000

const fs = require("fs");
const path = require("path");
const http = require("http");

const API_BASE = "http://localhost:5000/api";

// Simple fetch-like helper using http module
function apiRequest(endpoint, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${API_BASE}${endpoint}`);
        const reqOptions = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: options.method || "GET",
            headers: options.headers || {},
        };

        const req = http.request(reqOptions, (res) => {
            let body = "";
            res.on("data", (chunk) => (body += chunk));
            res.on("end", () => {
                try {
                    const data = JSON.parse(body);
                    if (!data.success) {
                        reject(new Error(`API Error: ${data.data || data.message}`));
                    } else {
                        resolve(data);
                    }
                } catch (e) {
                    reject(new Error(`Parse error: ${body}`));
                }
            });
        });
        req.on("error", reject);
        if (options.body) req.write(options.body);
        req.end();
    });
}

// Multipart upload helper
function uploadFile(endpoint, filePath, fields) {
    return new Promise((resolve, reject) => {
        const boundary = "----Boundary" + Date.now();
        const fileContent = fs.readFileSync(filePath);
        const fileName = path.basename(filePath);

        let bodyParts = [];

        // Add text fields
        for (const [key, value] of Object.entries(fields)) {
            bodyParts.push(
                `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="${key}"\r\n\r\n` +
                `${value}\r\n`
            );
        }

        // Add file
        const fileHeader =
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="resume"; filename="${fileName}"\r\n` +
            `Content-Type: application/pdf\r\n\r\n`;
        const fileFooter = `\r\n--${boundary}--\r\n`;

        const headerBuf = Buffer.from(fileHeader);
        const footerBuf = Buffer.from(fileFooter);
        const fieldsBuf = Buffer.from(bodyParts.join(""));
        const fullBody = Buffer.concat([fieldsBuf, headerBuf, fileContent, footerBuf]);

        const url = new URL(`${API_BASE}${endpoint}`);
        const reqOptions = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: "POST",
            headers: {
                "Content-Type": `multipart/form-data; boundary=${boundary}`,
                "Content-Length": fullBody.length,
            },
        };

        const req = http.request(reqOptions, (res) => {
            let body = "";
            res.on("data", (chunk) => (body += chunk));
            res.on("end", () => {
                try {
                    const data = JSON.parse(body);
                    resolve(data);
                } catch (e) {
                    reject(new Error(`Parse error: ${body}`));
                }
            });
        });
        req.on("error", reject);
        req.write(fullBody);
        req.end();
    });
}

async function main() {
    console.log("=== RecruitAI Pipeline Test ===\n");

    // Step 1: Health Check
    console.log("[1] Health Check...");
    const health = await apiRequest("/health");
    console.log("    OK:", health.message);

    // Step 2: Create Job
    console.log("\n[2] Creating Job...");
    const jobRes = await apiRequest("/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            title: "Senior React Developer",
            company: "TestCorp",
            description:
                "Looking for a Senior React Developer with 4+ years of experience. Must know React, TypeScript, Node.js, REST APIs, GraphQL, PostgreSQL, Docker, and AWS. Experience with CI/CD, testing (Jest, Cypress), and agile methodologies required.",
            location: "Remote",
            skills: ["React", "TypeScript", "Node.js", "GraphQL", "PostgreSQL", "Docker", "AWS"],
            status: "open",
        }),
    });
    const jobId = jobRes.data.job._id;
    console.log("    OK! Job ID:", jobId);

    // Step 3: Upload Resume
    console.log("\n[3] Uploading Resume...");

    // Look for a PDF in common locations
    const searchPaths = [
        path.join(__dirname, "src", "uploads"),
        path.join(__dirname),
        "C:\\Users\\harsh\\OneDrive\\Desktop",
        "C:\\Users\\harsh\\Downloads",
    ];

    let pdfPath = null;
    for (const dir of searchPaths) {
        try {
            const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".pdf"));
            if (files.length > 0) {
                pdfPath = path.join(dir, files[0]);
                break;
            }
        } catch (e) {
            // directory doesn't exist, skip
        }
    }

    if (!pdfPath) {
        console.log("    ERROR: No PDF found!");
        console.log("    Place a PDF resume file in one of these locations:");
        console.log("      - backend/src/uploads/");
        console.log("      - Desktop");
        console.log("      - Downloads");
        console.log("    Then run this script again.");
        console.log("\n    Job ID for manual testing:", jobId);
        process.exit(0);
    }

    console.log("    Found PDF:", pdfPath);
    const uploadRes = await uploadFile("/resumes/upload", pdfPath, {
        jobId: jobId,
        candidateName: "Test Candidate",
        candidateEmail: "test@example.com",
    });

    if (!uploadRes.success) {
        console.log("    Upload failed:", uploadRes.data);
        console.log("    Job ID for manual testing:", jobId);
        process.exit(1);
    }

    const resume = uploadRes.data.resume;
    const resumeId = resume._id;
    console.log("    OK! Resume ID:", resumeId);
    console.log("    Parsed text:", resume.parsedText ? `${resume.parsedText.length} chars` : "EMPTY");
    console.log("    Entities extracted:", resume.extractedEntities ? "YES" : "no");
    console.log("    Status:", resume.status);

    if (!resume.parsedText) {
        console.log("\n    WARNING: PDF text is empty - screening will fail.");
        console.log("    The PDF might be scanned/image-based. Try a text-based PDF.");
        console.log("    Job ID:", jobId, "| Resume ID:", resumeId);
        process.exit(0);
    }

    // Step 4: Screen Resume
    console.log("\n[4] AI Screening (may take 10-20s)...");
    const screenRes = await apiRequest("/screening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId }),
    });

    const screening = screenRes.data.screening;
    const screeningId = screening._id;
    console.log("    OK! Screening ID:", screeningId);
    console.log("    Score:", screening.overallScore + "/100");
    console.log("    Recommendation:", screening.recommendation);
    console.log("    Matched:", (screening.matchedSkills || []).join(", "));
    console.log("    Missing:", (screening.missingSkills || []).join(", "));

    // Step 5: Generate Questions
    console.log("\n[5] AI Interview Questions (may take 10-20s)...");
    const qRes = await apiRequest("/questions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screeningId }),
    });

    const questions = qRes.data.interviewQuestion.questions;
    console.log(`    OK! Generated ${questions.length} questions:`);
    questions.forEach((q, i) => {
        console.log(`    ${i + 1}. [${q.category}/${q.difficulty}] ${q.question}`);
    });

    // Summary
    console.log("\n===== PIPELINE TEST COMPLETE =====");
    console.log("Job ID:       ", jobId);
    console.log("Resume ID:    ", resumeId);
    console.log("Screening ID: ", screeningId);
    console.log("Score:        ", screening.overallScore + "/100", `(${screening.recommendation})`);
    console.log("Questions:    ", questions.length, "generated");
    console.log("==================================");
}

main().catch((err) => {
    console.error("\nFAILED:", err.message);
    process.exit(1);
});
