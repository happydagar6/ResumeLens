// src/controllers/usersController.js
// Minimal users endpoint: list users by role.
// Used by the frontend's "Assign Hiring Manager" UI — recruiters and admins
// need to query the list of hiring_manager users so they can pick one to assign.

const User = require("../models/userModel");
const { response } = require("../utils/response");

// GET /api/users?role=hiring_manager
// Query params:
//   role  — filter by role enum ("recruiter" | "hiring_manager" | "admin")
async function getUsers(req, res, next) {
    try {
        const filter = { organizationId: req.user.organizationId }; // Only return users from the same org
        if (req.query.role) {
            filter.role = req.query.role;
        }

        const users = await User.find(filter)
            .select("name email role company createdAt")
            .sort({ name: 1 });

        response(res, 200, { users });
    } catch (err) {
        next(err);
    }
}

module.exports = { getUsers };
