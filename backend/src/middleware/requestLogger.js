// src/middleware/requestLogger.js

const requestLogger = (req, res, next) => {
    console.log(`Request: ${req.method} ${req.url}`); // logs the request method and url
    next(); // calls the next middleware
};

module.exports = requestLogger;