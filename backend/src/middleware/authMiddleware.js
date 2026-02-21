// src/middleware/authMiddleware.js

const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const { CustomError } = require("../utils/errors");

const authMiddleware = async (req, res, next) => {
    // Try cookie first, then fallback to Authorization header
    let token = req.cookies?.token;

    if (!token) {
        const authHeader = req.header("Authorization");
        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.replace("Bearer ", "").trim();
        }
    }

    if (!token) return next(new CustomError("Unauthorized", 401));

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch the full user from DB so req.user always has organizationId and
        // any other fields that are not stored in the JWT payload.
        const user = await User.findById(decoded.id).select("-password");
        if (!user) return next(new CustomError("User not found", 401));

        req.user = {
            id: user._id.toString(),
            role: user.role,
            organizationId: user.organizationId ?? null,
            name: user.name,
            email: user.email,
        };
        next();
    } catch (error) {
        next(new CustomError("Invalid token", 401));
    }
};

module.exports = authMiddleware;