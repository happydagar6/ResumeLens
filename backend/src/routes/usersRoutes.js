// src/routes/usersRoutes.js
// Provides user-listing endpoints used for assigning hiring managers to jobs.
// Accessible by recruiters (need to see HM list) and admins.

const express = require("express");
const { getUsers } = require("../controllers/usersController");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");

const router = express.Router();

// All user routes require authentication
router.use(authMiddleware);

// GET /api/users?role=hiring_manager
// Recruiters need this to find hiring managers to assign to their jobs.
// Admins can list any role.
router.get("/", authorize("recruiter", "admin"), getUsers);

module.exports = router;
