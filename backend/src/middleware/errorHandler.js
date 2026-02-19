// src/middleware/errorHandler.js

const { response } = require("../utils/response");

const errorHandler = (err, req, res, next) => {
    console.error(err.stack || err.message);

    // Handle Zod validation errors (return 400, not 500)
    if (err.name === "ZodError" || err.issues) {
        const messages = (err.issues || []).map(
            (issue) => `${issue.path.join(".")}: ${issue.message}`
        );
        return response(res, 400, null, messages.join("; ") || "Validation failed");
    }

    const status = err.status || 500;
    response(res, status, null, err.message || "Internal Server Error");
};

module.exports = errorHandler;