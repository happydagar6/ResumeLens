// src/config/multer.js
// Centralized Multer configuration for file uploads

const multer = require("multer");
const path = require("path");
const { CustomError } = require("../utils/errors");

// Sotrage: save to /src/uploads with unique filenames
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "../uploads"));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        cb(null, `${uniqueSuffix}-${sanitizedName}`);
    },
});

// Only allow PDF files
const fileFilter = (req, file, cb) => {
    const allowedTypes = ["application/pdf"];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new CustomError("Invalid file type. Only PDF files are allowed."));
    }
};

// Export configured upload middleware
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
});

module.exports = upload;
