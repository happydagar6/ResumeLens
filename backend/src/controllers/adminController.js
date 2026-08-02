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
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
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

    // Why we used Promise.all here ?
    // We use Promise.all to execute two separate database operations in parallel
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
        // calculate jobCount from _jobs array
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
      User.countDocuments(orgFilter), // second db call - no need for _jobs lookup
    ]);

    response(res, 200, { // send response
        users, // list of users
        pagination: { // pagination info
            page, // current page
            limit, // items per page
            total, // total number of users
            pages: Math.ceil(total / limit), // total number of pages
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
    try { // Wrap the entire controller function in a try-catch block to handle potential errors
        const roleSchema = z.object({
            role: z.enum(["recruiter", "hiring_manager", "admin"]),
        }); // define validation schema for role

        const { role } = roleSchema.parse(req.body); // validate the request body

        // Safety: admin cannot change their own role
        if (req.params.id === req.user.id) {
            throw new CustomError("You cannot change your own role", 400);
        } // If the admin tries to change their own role, throw an error

        // FInd the target user - must be in the same organization
        const target = await User.findOne({
            _id: req.params.id,
            organizationId: req.user.organizationId,
        }); // find the target user in the same organization

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
            throw new CustomError("You cannot deactivate your own account", 400); // If the admin tries to deactivate their own account, throw an error
        }

        const target = await User.findOne({ // Find the target user in the same organization
            _id: req.params.id,
            organizationId: req.user.organizationId,
        }); 
        if (!target) throw new CustomError("User not found in your organization", 404); // If the user is not found, throw an error
        if (target.isDeactivated) { // If the user is already deactivated, throw an error
            throw new CustomError("User is already deactivated", 400);
        }

        target.isDeactivated = true; // soft-deactivate the user
        await target.save(); // Save the change

        response(res, 200, null, `${target.name} has been deactivated successfully`); // send response
    } catch (error) { // Wrap the entire controller function in a try-catch block to handle potential errors
        next(error); // Pass the error to the next error handler middleware
    } // end of catch
} // end of deactivateUser

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/users/:id/reactivate
// Reverses a deactivation. Sets isDeactivated: false.
// ─────────────────────────────────────────────────────────────────────────────

async function reactivateUser(req, res, next) { // Wrap the entire controller function in a try-catch block to handle potential errors
    try {
        if (req.params.id === req.user.id) { // If the admin tries to reactivate their own account, throw an error
            throw new CustomError("Cannot modify your own account status", 400);
        }

        const target = await User.findOne({ // Find the target user in the same organization
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