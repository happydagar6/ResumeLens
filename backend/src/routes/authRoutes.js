// src/routes/authRoutes.js

const express = require("express");
const {
  signup,
  login,
  logout,
  me,
  updateProfile,
  updatePassword,
  getInviteCode,
  getTeamMembers,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");

// Import the Tier 1 Auth Rate limiters
const {
    loginLimiter,
    signupLimiter,
    forgotPasswordLimiter,
    refreshLimiter,
    resetPasswordLimiter,
}
 = require("../middleware/rateLimiter");

const router = express.Router();
// ── Public Auth Endpoints (Protected with strict rate limiting) ───────────────
router.post("/signup", signupLimiter, signup);
router.post("/login", loginLimiter, login);
router.post("/logout", logout);
router.post("/refresh", refreshLimiter, refreshAccessToken);
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/reset-password", resetPasswordLimiter, resetPassword);
// ── Authenticated User Endpoints ──────────────────────────────────────────────
router.get("/me", authMiddleware, me);
router.put("/profile", authMiddleware, updateProfile);
router.put("/password", authMiddleware, updatePassword);
router.get("/invite-code", authMiddleware, authorize("recruiter", "admin"), getInviteCode);
router.get("/team", authMiddleware, getTeamMembers);
module.exports = router;