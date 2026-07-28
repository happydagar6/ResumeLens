// src/middleware/xssMiddleware.js
const xss = require("xss");

// Recursively sanitize all strings in an object without destroying the object reference
const sanitizeObject = (obj) => {
    if (typeof obj === "string") return xss(obj);
    if (Array.isArray(obj)) return obj.map(sanitizeObject);
    
    if (typeof obj === "object" && obj !== null) {
        Object.keys(obj).forEach((key) => {
            obj[key] = sanitizeObject(obj[key]);
        });
    }
    return obj;
};

const xssMiddleware = (req, res, next) => {
    // Safely clean data inside the objects (bypassing the Express getter crash)
    if (req.body) sanitizeObject(req.body);
    if (req.query) sanitizeObject(req.query);
    if (req.params) sanitizeObject(req.params);
    next();
};

module.exports = xssMiddleware;
