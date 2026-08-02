// src/middleware/xssMiddleware.js
const xss = require("xss");

// Recursively sanitize all strings in an object without destroying the object reference
const sanitizeObject = (obj) => {
    if (typeof obj === "string") return xss(obj); // recursively sanitize all strings
    if (Array.isArray(obj)) return obj.map(sanitizeObject); // recursively sanitize all strings in arrays
    
    if (typeof obj === "object" && obj !== null) {
        Object.keys(obj).forEach((key) => { // iterate over all the keys in the object
            obj[key] = sanitizeObject(obj[key]); // recursively sanitize all strings in objects
        });
    }
    return obj; // return the sanitized object
};

const xssMiddleware = (req, res, next) => {
    // Safely clean data inside the objects (bypassing the Express getter crash)
    if (req.body) sanitizeObject(req.body); // sanitize request body
    if (req.query) sanitizeObject(req.query); // sanitize request query
    if (req.params) sanitizeObject(req.params); // sanitize request parameters
    next(); // move to the next middleware
};

module.exports = xssMiddleware;
