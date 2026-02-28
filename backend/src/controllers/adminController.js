// src/controllers/adminController.js
// Admin-only endpoints for user management across the organization.
// All functions require: authMiddleware + authorize("admin")

const mongoose = require("mongoose");
const User = require("../models/userModel");
const Job = require("../models/jobModel");
const { response } = require("../utils/response");
const { CustomError } = require("../utils/errors");
const { z } = require("zod");

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/users
// Lists all users in the admin's organization with:
//   - Basic profile fields (name, email, role, company, createdAt)
//   - isDeactivated status
//   - jobCount: how many jobs this user has created
//   - pagination support (?page=1&limit=20)
// ─────────────────────────────────────────────────────────────────────────────

async function getAdminUsers(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1100, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    // Filter within the admin's own org only
    const orgFilter = { organizationId: req.user.organizationId };

    // Optional search (?search=john)
    if (req.query.search) {
      orgFilter.$or = [
        { name: { $regex: req.query.search, $options: "i" } },
        { email: { $regex: req.query.search, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.aggregate([
        { $match: orgFilter },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        // Join jobs to count how many jobs this user created
        {
          $lookup: {
            from: "jobs",
            localField: "_id",
            foreignField: "createdBy",
            as: "_jobs",
          },
        },
        {
          $addFields: {
            jobCount: { $size: "$_jobs" },
          },
        },
        // Strip password and the raw joined array — never expose password
        {
          $project: {
            password: 0,
            _jobs: 0,
          },
        },
      ]),
      User.countDocuments(orgFilter),
    ]);

    response(res, 200, {
        users,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    });
  } catch (error) {
    next(error);
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/admin/users/:id/role
// Body: { role: "recruiter" | "hiring_manager" | "admin" }
// Changes a user's role.
// Safety rules:
//   - Cannot change your own role
//   - Role must be a valid enum value
// ─────────────────────────────────────────────────────────────────────────────

async function updateUserRole(req, res, next) {
    try {
        const roleSchema = z.object({
            role: z.enum(["recruiter", "hiring_manager", "admin"]),
        });

        const { role } = roleSchema.parse(req.body);

        // Safety: admin cannot change their own role
        if (req.params.id === req.user.id) {
            throw new CustomError("You cannot change your own role", 400);
        }

        // FInd the target user - must be in the same organization
        const target = await User.findOne({
            _id: req.params.id,
            organizationId: req.user.organizationId,
        });
        if(!target) throw new CustomError("User not found in your organization", 404);

        target.role = role; // Update the role
        await target.save(); // Save the change

        response(res, 200, {
            user: {
                id: target._id,
                name: target.name,
                email: target.email,
                role: target.role,
            },
        }, `Role updated to "${role}" successfully`);
    } catch (error) {
        next(error);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/users/:id
// Soft-deactivates a user (sets isDeactivated: true).
// Does NOT delete data. The user cannot log in but all their
// jobs/resumes/screenings remain intact.
// Safety: cannot deactivate yourself.
// ─────────────────────────────────────────────────────────────────────────────

async function deactivateUser(req, res, next) {
    try {
        if (req.params.id === req.user.id) {
            throw new CustomError("You cannot deactivate your own account", 400);
        }

        const target = await User.findOne({
            _id: req.params.id,
            organizationId: req.user.organizationId,
        });
        if (!target) throw new CustomError("User not found in your organization", 404);
        if (target.isDeactivated) {
            throw new CustomError("User is already deactivated", 400);
        }

        target.isDeactivated = true;
        await target.save();

        response(res, 200, null, `${target.name} has been deactivated successfully`);
    } catch (error) {
        next(error);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/users/:id/reactivate
// Reverses a deactivation. Sets isDeactivated: false.
// ─────────────────────────────────────────────────────────────────────────────

async function reactivateUser(req, res, next) {
    try {
        if (req.params.id === req.user.id) {
            throw new CustomError("Cannot modify your own account status", 400);
        }

        const target = await User.findOne({
            _id: req.params.id,
            organizationId: req.user.organizationId,
        });
        if (!target) throw new CustomError("User not found in your organization", 404);
        if (!target.isDeactivated) {
            throw new CustomError("User is not currently deactivated", 400);
        }

        target.isDeactivated = false;
        await target.save();

        response(res, 200, null, `${target.name} has been reactivated successfully`);
    } catch (error) {
        next(error);
    }
}

module.exports = { getAdminUsers, updateUserRole, deactivateUser, reactivateUser };