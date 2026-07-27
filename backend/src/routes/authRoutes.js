// src/routes/authRoutes.js

const express = require("express");
const { signup, login, logout, me, updateProfile, updatePassword, 
    getInviteCode, getTeamMembers, refreshAccessToken, forgotPassword, resetPassword } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh", refreshAccessToken);
router.get("/me", authMiddleware, me);
router.put("/profile", authMiddleware, updateProfile);
router.put("/password", authMiddleware, updatePassword);
router.get("/invite-code", authMiddleware, authorize("recruiter", "admin"), getInviteCode);
router.get("/team", authMiddleware, getTeamMembers);
router.post("/forgot-password", forgotPassword);
router.put("/reset-password", resetPassword);

module.exports = router;