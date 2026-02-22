// src/controllers/notificationController.js

const Notification = require("../models/notificationModel");
const { response } = require("../utils/response");
const { CustomError } = require("../utils/errors");

// GET /api/notifications
// Returns the 30 most-recent notifications for the logged-in user, newest first.
// Also returns the total unread count.
async function getNotifications(req, res, next) {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .limit(30)
        .lean(),
      Notification.countDocuments({ userId: req.user.id, read: false }),
    ]);

    response(res, 200, { notifications, unreadCount });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/notifications/read-all
// Marks every unread notification belonging to the logged-in user as read.
async function markAllRead(req, res, next) {
  try {
    await Notification.updateMany(
      { userId: req.user.id, read: false },
      { $set: { read: true } }
    );
    response(res, 200, null, "All notifications marked as read");
  } catch (err) {
    next(err);
  }
}

// PATCH /api/notifications/:id/read
// Marks a single notification as read.
async function markOneRead(req, res, next) {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!notification) throw new CustomError("Notification not found", 404);

    notification.read = true;
    await notification.save();

    response(res, 200, { notification }, "Notification marked as read");
  } catch (err) {
    next(err);
  }
}

module.exports = { getNotifications, markAllRead, markOneRead };
