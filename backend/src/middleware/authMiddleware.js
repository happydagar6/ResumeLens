// src/middleware/authMiddleware.js

const jwt = require("jsonwebtoken");
const { CustomError } = require("../utils/errors");

const authMiddleware = (req, res, next) => {
    const token = req.cookies.token;
    req.header('Authorization')?.replace('Bearer', '');
    if(!token) return next(new CustomError('Unauthorized', 401));

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        next(new CustomError('Invalid token', 401));
    }
};

module.exports = authMiddleware;