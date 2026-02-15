// src/middleware/requestLogger.js

const requestLogger = (req, res, next) => {
    console.log(`Request: ${req.method} ${req.url}`);
    next();
};

module.exports = requestLogger;