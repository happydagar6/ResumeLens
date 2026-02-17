// src/utils/validators.js

const { CustomError } = require("./errors");

/**
 * Express middleware factory for Zod validation
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {'body' | 'params' | 'query'} source - Request property to validate
 */
const validate = (schema, source = "body") => {
    return (req, res, next) => {
        const result = schema.safeParse(req[source]);
        if (!result.success) {
            const messages = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
            return next(new CustomError(`Validation error: ${messages}`, 400));
        }
        req[source] = result.data;
        next();
    };
};

module.exports = { validate };