// src/routes/authRoutes.js

const express = require("express");
const { signup, login, logout, me, updateProfile, updatePassword, getInviteCode } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", authMiddleware, me);
router.put("/profile", authMiddleware, updateProfile);
router.put("/password", authMiddleware, updatePassword);
router.get("/invite-code", authMiddleware, authorize("recruiter", "admin"), getInviteCode);

module.exports = router;