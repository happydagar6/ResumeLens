// src/middleware/errorHandler.js

const { response } = require("../utils/response");

const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    const status = err.status || 500;
    response(res, status, null, err.message || 'Internal Server Error');
};

module.exports = errorHandler;