// src/middleware/authorize.js
//
// Role-based authorization middleware.
// Must be used AFTER authMiddleware (which sets req.user from the JWT).
//
// Usage:
//   router.post("/", authMiddleware, authorize("recruiter", "admin"), createJob);
//   router.delete("/:id", authMiddleware, authorize("admin"), deleteUser);
//
// How it works:
//   authMiddleware decodes the JWT → sets req.user = { id, role, iat, exp }
//   authorize(...roles) checks that req.user.role is in the allowed roles list
//   If not → 403 Forbidden. If yes → calls next().

const { CustomError } = require("../utils/errors");

const authorize = (...roles) => {
    return (req, res, next) => {
        // authMiddleware must run first — if req.user is missing something went wrong
        if (!req.user || !req.user.role) {
            return next(new CustomError("Unauthorized — no role found in token", 401));
        }

        if (!roles.includes(req.user.role)) {
            return next(
                new CustomError(
                    `Forbidden — requires one of: [${roles.join(", ")}]. Your role: ${req.user.role}`,
                    403
                )
            );
        }

        next();
    };
};

module.exports = authorize;
