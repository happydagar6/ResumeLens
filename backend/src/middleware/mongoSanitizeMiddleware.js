// src/middleware/mongoSanitizeMiddleware.js
const mongoSanitize = require("express-mongo-sanitize");

const mongoSanitizeMiddleware = (req, res, next) => {
    // Safely sanitize the objects in place without trying to overwrite the read-only Express getters
    if (req.body) mongoSanitize.sanitize(req.body);
    if (req.query) mongoSanitize.sanitize(req.query);
    if (req.params) mongoSanitize.sanitize(req.params);
    if (req.headers) mongoSanitize.sanitize(req.headers);
    next();
};

module.exports = mongoSanitizeMiddleware;
