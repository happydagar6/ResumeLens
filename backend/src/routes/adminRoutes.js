// src/routes/adminRoutes.js
// All routes in this file require: authentication + admin role.
// Applying authorize("admin") at the router level means every single
// route below it is protected — no need to add it per-route.

const express = require("express");
const {
    getAdminUsers,
    updateUserRole,
    deactivateUser,
    reactivateUser,
    getAdminAuditLogs,
} = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");

const router = express.Router();

// Apply both middlewares to ALL routes in this file at once
router.use(authMiddleware);
router.use(authorize("admin")); // Any non-admin hitting these routes gets 403

// GET  /api/admin/users              → list org users with job counts
// PUT  /api/admin/users/:id/role     → change a user's role
// DELETE /api/admin/users/:id        → deactivate (soft delete)
// PATCH  /api/admin/users/:id/reactivate → undo deactivation
// GET  /api/admin/audit-logs         → view organization administrative audit trail

router.get("/users",                    getAdminUsers);
router.put("/users/:id/role",           updateUserRole);
router.delete("/users/:id",             deactivateUser);
router.patch("/users/:id/reactivate",   reactivateUser);
router.get("/audit-logs",               getAdminAuditLogs);

module.exports = router;