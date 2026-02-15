// src/services/pdfParserService.js

const pdfParse = require("pdf-parse");
const fs = require("fs").promises;

async function parsePDF(filePath) {
    try {
        const dataBuffer = await fs.readFile(filePath);
        const data = await pdfParse(dataBuffer);
        return data.text.trim(); // Cleaned text
    } catch (error) {
        throw new Error("PDF parsing failed");
    } finally {
        await fs.unlink(filePath).catch(() => {}); // Delete temp file
    }
}

module.exports = { parsePDF };
