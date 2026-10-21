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

    const isProduction = process.env.NODE_ENV === "production";
    const status = err.status || 500;

    // ── SECURITY HARDENING: Turn off debug mode in production ─────────────────
    // In production, mask raw 500 internal error messages (e.g. database connection
    // strings or internal driver exceptions) so they are never leaked to clients.
    const clientMessage = (status === 500 && isProduction)
        ? "Internal Server Error"
        : (err.message || "Internal Server Error");

    response(res, status, null, clientMessage);
};

module.exports = errorHandler;