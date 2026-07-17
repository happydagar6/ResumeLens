// src/config/multer.js
const multer = require("multer");
const { CustomError } = require("../utils/errors");

// Use Memory Storage so files are kept in RAM (req.file.buffer) instead of the hard drive
const storage = multer.memoryStorage();

// Only allow PDF files
const fileFilter = (req, file, cb) => {
    const allowedTypes = ["application/pdf"];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new CustomError("Invalid file type. Only PDF files are allowed."));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
});

module.exports = upload;
