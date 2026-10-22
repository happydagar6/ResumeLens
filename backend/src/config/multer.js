// src/config/multer.js
const multer = require("multer");
const path = require("path");
const { CustomError } = require("../utils/errors");

// Strict extension blacklist to prevent executable upload attacks
const DANGEROUS_EXTENSIONS = [
    ".php", ".phtml", ".php3", ".php4", ".php5", ".phps",
    ".exe", ".sh", ".bash", ".bat", ".cmd", ".msi", ".com",
    ".js", ".jsx", ".ts", ".tsx", ".py", ".rb", ".pl", ".cgi",
    ".jsp", ".asp", ".aspx", ".html", ".htm", ".svg", ".jar",
    ".vbs", ".ps1"
];

// Memory Storage so files stay in RAM buffer (req.file.buffer) instead of touching disk
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    // 1. Guard against null byte injections in filename
    if (file.originalname && file.originalname.includes("\0")) {
        return cb(new CustomError("Malicious filename detected", 400));
    }

    const ext = path.extname(file.originalname || "").toLowerCase();

    // 2. Reject executable or script extensions
    if (DANGEROUS_EXTENSIONS.includes(ext) || (file.originalname && file.originalname.toLowerCase().includes(".php"))) {
        return cb(new CustomError("Dangerous file type blocked. Executable and script files are strictly prohibited.", 400));
    }

    // 3. Must strictly have a .pdf extension
    if (ext !== ".pdf") {
        return cb(new CustomError("Invalid file extension. Only PDF (.pdf) files are allowed.", 400));
    }

    // 4. Must have application/pdf MIME type
    if (file.mimetype !== "application/pdf") {
        return cb(new CustomError("Invalid MIME type. Only PDF files are allowed.", 400));
    }

    cb(null, true);
};

// Magic bytes validation helper: Validates whether buffer starts with %PDF- (0x25, 0x50, 0x44, 0x46)
function isPdfBuffer(buffer) {
    if (!buffer || buffer.length < 4) return false;
    return (
        buffer[0] === 0x25 && // %
        buffer[1] === 0x50 && // P
        buffer[2] === 0x44 && // D
        buffer[3] === 0x46    // F
    );
}

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1,                  // Max 1 file per upload
    },
});

module.exports = upload;
module.exports.isPdfBuffer = isPdfBuffer;

