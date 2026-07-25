// src/routes/notificationRoutes.js

const express = require("express");
const {
  getNotifications,
  markAllRead,
  markOneRead,
  deleteAllNotifications,
} = require("../controllers/notificationController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// All notification routes require authentication
router.use(authMiddleware);

router.get("/", getNotifications);
router.patch("/read-all", markAllRead);
router.patch("/:id/read", markOneRead);
router.delete("/", deleteAllNotifications);

module.exports = router;
