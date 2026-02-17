// src/middleware/authMiddleware.js

const jwt = require("jsonwebtoken");
const { CustomError } = require("../utils/errors");

const authMiddleware = (req, res, next) => {
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
        req.user = decoded;
        next();
    } catch (error) {
        next(new CustomError("Invalid token", 401));
    }
};

module.exports = authMiddleware;