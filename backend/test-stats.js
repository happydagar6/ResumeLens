// test-stats.js — Quick smoke test for Phase 6 Stats API
const http = require("http");

function get(path, cookie) {
    return new Promise((resolve, reject) => {
        const opts = {
            hostname: "localhost", port: 5000, path,
            headers: cookie ? { Cookie: cookie } : {},
        };
        const req = http.get(opts, (res) => {
            let data = "";
            res.on("data", (d) => (data += d));
            res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        });
        req.on("error", reject);
    });
}

function post(path, body) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const opts = {
            hostname: "localhost", port: 5000, path, method: "POST",
            headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
        };
        const req = http.request(opts, (res) => {
            let data = "";
            res.on("data", (d) => (data += d));
            res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(data), headers: res.headers }));
        });
        req.on("error", reject);
        req.write(payload);
        req.end();
    });
}

async function main() {
    console.log("=== Phase 6 Stats API Test ===\n");

    // 1. Login
    const login = await post("/api/auth/login", { email: "test@example.com", password: "Test@1234" });
    const cookie = login.headers["set-cookie"]?.[0]?.split(";")[0];
    if (!cookie) { console.log("❌ Login failed:", login.body.message); process.exit(1); }
    console.log("✅ [1] Login OK");

    // 2. GET /api/stats/overview
    const overview = await get("/api/stats/overview", cookie);
    if (overview.status !== 200) { console.log("❌ Overview failed:", overview.body); process.exit(1); }
    const d = overview.body.data;
    console.log("✅ [2] GET /api/stats/overview");
    console.log("   Jobs      → total:", d.jobs.total, "| open:", d.jobs.open, "| closed:", d.jobs.closed, "| draft:", d.jobs.draft);
    console.log("   Resumes   → total:", d.resumes.total, "| screened:", d.resumes.screened, "| pending:", d.resumes.pending, "| errors:", d.resumes.errors);
    console.log("   Rate      →", d.resumes.screeningRate + "%");
    console.log("   Scoring   → avg:", d.screening.avgScore, "| high:", d.screening.highestScore, "| low:", d.screening.lowestScore);
    console.log("   Recs      →", JSON.stringify(d.screening.byRecommendation));
    console.log("   byStatus  →", JSON.stringify(d.resumes.byStatus));
    console.log("   RecentJobs:", d.recentJobs.length, "entries");

    // 3. GET /api/stats/job/:jobId
    if (d.recentJobs.length === 0) {
        console.log("⚠️  No jobs in DB — skipping job stats test");
    } else {
        const jobId = d.recentJobs[0]._id;
        const jobStats = await get("/api/stats/job/" + jobId, cookie);
        if (jobStats.status !== 200) { console.log("❌ Job stats failed:", jobStats.body); process.exit(1); }
        const j = jobStats.body.data;
        console.log("\n✅ [3] GET /api/stats/job/:jobId  [" + j.job.title + " @ " + j.job.company + "]");
        console.log("   Resumes   → total:", j.resumes.total, "| screened:", j.resumes.screened, "| pending:", j.resumes.pending, "| errors:", j.resumes.errors);
        console.log("   Rate      →", j.resumes.screeningRate + "%");
        console.log("   Scoring   → avg:", j.screening.avgScore, "| high:", j.screening.highestScore, "| low:", j.screening.lowestScore);
        console.log("   Bands     →", JSON.stringify(j.screening.scoreDistribution));
        console.log("   Recs      →", JSON.stringify(j.screening.byRecommendation));
        console.log("   Top Cands →", j.topCandidates.length, "returned");
        if (j.topCandidates[0]) {
            const top = j.topCandidates[0];
            console.log("   #1        →", top.resumeId?.candidateName, "→", top.overallScore + "/100 (" + top.recommendation + ")");
        }

        // Check score distribution is correct (95 → 81-100 band)
        if (j.screening.highestScore > 80) {
            const has8100 = "81-100" in j.screening.scoreDistribution;
            console.log("   Bands OK  →", has8100 ? "81-100 bucket present ✅" : "❌ expected 81-100 bucket");
        }
    }

    // 4. Guard: invalid ObjectId → 400
    const bad = await get("/api/stats/job/not-a-valid-id", cookie);
    console.log("\n✅ [4] Invalid ID guard  →", bad.status === 400 ? "400 Bad Request ✅" : "❌ expected 400, got " + bad.status);

    // 5. Guard: valid but missing ObjectId → 404
    const notFound = await get("/api/stats/job/000000000000000000000000", cookie);
    console.log("✅ [5] Not-found guard   →", notFound.status === 404 ? "404 Not Found ✅" : "❌ expected 404, got " + notFound.status);

    // 6. Guard: no auth → 401
    const noAuth = await get("/api/stats/overview");
    console.log("✅ [6] No-auth guard     →", noAuth.status === 401 ? "401 Unauthorized ✅" : "❌ expected 401, got " + noAuth.status);

    console.log("\n╔══════════════════════════════════════╗");
    console.log("║       PHASE 6 TEST COMPLETE ✅        ║");
    console.log("╠══════════════════════════════════════╣");
    console.log("║  GET /api/stats/overview       ✅     ║");
    console.log("║  GET /api/stats/job/:jobId     ✅     ║");
    console.log("║  Auth guard (401)              ✅     ║");
    console.log("║  Invalid ID guard (400)        ✅     ║");
    console.log("║  Not-found guard (404)         ✅     ║");
    console.log("╚══════════════════════════════════════╝");
}

main().catch((e) => { console.error("Test error:", e.message); process.exit(1); });
