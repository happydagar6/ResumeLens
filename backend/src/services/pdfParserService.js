// src/services/pdfParserService.js

const { PDFParse } = require("pdf-parse");
const fs = require("fs").promises;

async function parsePDF(filePath) {
    try {
        const dataBuffer = await fs.readFile(filePath);
        // pdf-parse v2.x: pass data in constructor options, then call getText()
        const parser = new PDFParse({ data: dataBuffer });
        const result = await parser.getText();
        await parser.destroy();
        return result.text.trim();
    } catch (error) {
        throw new Error("PDF parsing failed: " + error.message);
    } finally {
        await fs.unlink(filePath).catch(() => {}); // Delete temp file
    }
}

module.exports = { parsePDF };
