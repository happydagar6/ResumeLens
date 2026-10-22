// backend/tests/security.test.js
const request = require("supertest");
const app = require("../src/index");
const { connectDB } = require("../src/config/database");
const mongoose = require("mongoose");

describe("🛡️ Security & Architecture Test Suite", () => {
  // Connect to DB before tests and disconnect after
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  // ── 1. HTTP Security Headers (Helmet) ───────────────────────────────────────
  describe("HTTP Security Headers", () => {
    it("should enforce Helmet anti-clickjacking and nosniff headers", async () => {
      const res = await request(app).get("/api/health");

      expect(res.status).toBe(200);
      expect(res.headers["x-frame-options"]).toBe("DENY");
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
    });
  });

  // ── 2. Strict CORS Policy ───────────────────────────────────────────────────
  describe("CORS Policy", () => {
    it("should allow requests from permitted origin (localhost:3000)", async () => {
      const res = await request(app)
        .get("/api/health")
        .set("Origin", "http://localhost:3000");

      expect(res.status).toBe(200);
      expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
      expect(res.headers["access-control-allow-credentials"]).toBe("true");
    });

    it("should reject requests from unauthorized origins", async () => {
      const res = await request(app)
        .get("/api/health")
        .set("Origin", "https://unauthorized-malicious-domain.com");

      expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    });
  });

  // ── 3. Custom 404 Route Fallback ───────────────────────────────────────────
  describe("404 Catch-All Fallback", () => {
    it("should return a clean JSON 404 response for non-existent endpoints", async () => {
      const res = await request(app).get("/api/non-existent-testing-route");

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Route not found");
    });
  });

  // ── 4. File Upload Security (Executable & Non-PDF Defense) ───────────────────
  describe("File Upload Protection", () => {
    it("should block non-PDF and executable files (.php) from being uploaded", async () => {
      const fakePhpBuffer = Buffer.from("<?php echo 'malicious exploit'; ?>");

      const res = await request(app)
        .post("/api/public/apply/65f1a2b3c4d5e6f7a8b9c0d1")
        .attach("resume", fakePhpBuffer, "shell.php")
        .field("candidateName", "Hacker")
        .field("candidateEmail", "hacker@exploit.com");

      // Must be rejected with 400 Bad Request
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/PDF|Dangerous|prohibited/i);
    });
  });

  // ── 5. Account Enumeration Immunity (SEC-01) ────────────────────────────────
  describe("Authentication Surface & Account Enumeration", () => {
    it("should return uniform 200 message on forgot-password for non-existent emails", async () => {
      const res = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "definitely-does-not-exist-999@randomdomain.com" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("password reset link has been sent");
    });
  });
});
