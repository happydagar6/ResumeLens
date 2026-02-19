// test-pipeline.js — Tests the entire RecruitAI pipeline (Phase 1-4)
// Run: node test-pipeline.js
// Requires: backend server running on port 5000

const fs = require("fs");
const path = require("path");
const http = require("http");

const API_BASE = "http://localhost:5000/api";

// Cookie jar — persists auth cookie across requests
let authCookie = "";

// Simple fetch-like helper using http module
function apiRequest(endpoint, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${API_BASE}${endpoint}`);
        const reqOptions = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: options.method || "GET",
            headers: {
                ...(options.headers || {}),
                ...(authCookie ? { Cookie: authCookie } : {}),
            },
        };

        const req = http.request(reqOptions, (res) => {
            // Capture Set-Cookie header from login response
            if (res.headers["set-cookie"]) {
                authCookie = res.headers["set-cookie"]
                    .map((c) => c.split(";")[0])
                    .join("; ");
            }
            let body = "";
            res.on("data", (chunk) => (body += chunk));
            res.on("end", () => {
                try {
                    const data = JSON.parse(body);
                    if (!data.success) {
                        reject(new Error(`API Error: ${data.message || data.data}`));
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

// Multipart upload helper (sends auth cookie)
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
                ...(authCookie ? { Cookie: authCookie } : {}),
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
    console.log("=== RecruitAI Pipeline Test (Phase 1-4) ===\n");

    // Step 1: Health Check
    console.log("[1] Health Check...");
    const health = await apiRequest("/health");
    console.log("    OK:", health.message);

    // Step 2: Login
    console.log("\n[2] Logging in...");
    await apiRequest("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com", password: "Test@1234" }),
    });
    console.log("    OK! Auth cookie captured.");

    // Step 3: Create Job
    console.log("\n[3] Creating Job...");
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
    console.log("    JD analysis triggered (runs in background)...");

    // Step 4: Upload Resume
    console.log("\n[4] Uploading Resume...");

    const searchPaths = [
        path.join(__dirname, "test-resume.pdf"),       // generated by create-test-pdf.js
        path.join(__dirname, "src", "uploads"),
        path.join(__dirname),
        "C:\\Users\\harsh\\OneDrive\\Desktop",
        "C:\\Users\\harsh\\Downloads",
    ];

    let pdfPath = null;
    for (const searchPath of searchPaths) {
        try {
            const stat = fs.statSync(searchPath);
            if (stat.isFile() && searchPath.toLowerCase().endsWith(".pdf")) {
                pdfPath = searchPath;
                break;
            } else if (stat.isDirectory()) {
                const files = fs.readdirSync(searchPath).filter((f) => f.toLowerCase().endsWith(".pdf"));
                if (files.length > 0) {
                    pdfPath = path.join(searchPath, files[0]);
                    break;
                }
            }
        } catch (e) {
            // path doesn't exist, skip
        }
    }

    if (!pdfPath) {
        console.log("    ERROR: No PDF found!");
        console.log("    Place a PDF in Downloads or Desktop and rerun.");
        console.log("    Job ID for manual testing:", jobId);
        process.exit(0);
    }

    console.log("    Found PDF:", pdfPath);
    const uploadRes = await uploadFile("/resumes/upload", pdfPath, {
        jobId,
        candidateName: "Test Candidate",
        candidateEmail: "test@example.com",
    });

    if (!uploadRes.success) {
        console.log("    Upload failed:", uploadRes.message);
        process.exit(1);
    }

    const resume = uploadRes.data.resume;
    const resumeId = resume._id;
    console.log("    OK! Resume ID:", resumeId);
    console.log("    Parsed text:", resume.parsedText ? `${resume.parsedText.length} chars` : "EMPTY ⚠️");
    console.log("    Entities extracted:", resume.extractedEntities ? "YES" : "no");
    console.log("    Status:", resume.status);

    if (!resume.parsedText) {
        console.log("\n    ⚠️  WARNING: PDF text is empty.");
        console.log("    The PDF might be scanned/image-based. Use a text-based PDF.");
        console.log("    Job ID:", jobId, "| Resume ID:", resumeId);
        process.exit(0);
    }

    // Step 5: Phase 4 — LangGraph Pipeline Screening
    console.log("\n[5] Phase 4 — LangGraph Pipeline Screening (may take 10-20s)...");
    const pipelineRes = await apiRequest("/pipeline/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId }),
    });

    console.log("    OK! Screening complete!");
    console.log("    Score:", pipelineRes.data.score + "/100");
    console.log("    Recommendation:", pipelineRes.data.recommendation);
    console.log("    Screening ID:", pipelineRes.data.screeningId);
    if (pipelineRes.data.warnings?.length > 0) {
        console.log("    Warnings:", pipelineRes.data.warnings.join(", "));
    }
    const screeningId = pipelineRes.data.screeningId;

    // Step 6: Check Pipeline Status
    console.log("\n[6] Checking Pipeline Status...");
    const statusRes = await apiRequest(`/pipeline/status/${resumeId}`);
    console.log("    Resume status:", statusRes.data.status);
    console.log("    Overall score:", statusRes.data.screening?.overallScore);
    console.log("    Matched skills:", (statusRes.data.screening?.matchedSkills || []).join(", "));
    console.log("    Missing skills:", (statusRes.data.screening?.missingSkills || []).join(", "));

    // Step 7: Test Idempotency — run pipeline again on same resume
    console.log("\n[7] Idempotency Test — re-running pipeline on same resume...");
    const reRunRes = await apiRequest("/pipeline/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId }),
    });
    const sameId = reRunRes.data.screeningId === screeningId;
    console.log("    Re-run succeeded:", reRunRes.data.score + "/100");
    console.log("    Same Screening ID (upsert)?", sameId ? "YES ✅" : "NO ❌ (created duplicate)");

    // Step 8: Generate Interview Questions
    console.log("\n[8] Generating Interview Questions (may take 15-20s)...");
    const qRes = await apiRequest("/questions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screeningId }),
    });

    const questions = qRes.data.interviewQuestion.questions;
    console.log(`    OK! Generated ${questions.length} questions:`);
    questions.slice(0, 3).forEach((q, i) => {
        console.log(`    ${i + 1}. [${q.category}/${q.difficulty}] ${q.question}`);
    });
    if (questions.length > 3) console.log(`    ... and ${questions.length - 3} more`);

    // Final Summary
    console.log("\n╔══════════════════════════════════════╗");
    console.log("║       PHASE 4 TEST COMPLETE ✅        ║");
    console.log("╠══════════════════════════════════════╣");
    console.log(`║ Job ID:       ${jobId.substring(0, 22)} ║`);
    console.log(`║ Resume ID:    ${resumeId.substring(0, 22)} ║`);
    console.log(`║ Screening ID: ${screeningId.substring(0, 22)} ║`);
    console.log(`║ Score:        ${String(pipelineRes.data.score + "/100 (" + pipelineRes.data.recommendation + ")").padEnd(22)} ║`);
    console.log(`║ Questions:    ${String(questions.length + " generated").padEnd(22)} ║`);
    console.log(`║ Idempotency:  ${(sameId ? "PASS ✅" : "FAIL ❌").padEnd(22)} ║`);
    console.log("╚══════════════════════════════════════╝");
}

main().catch((err) => {
    console.error("\nFAILED:", err.message);
    process.exit(1);
});
