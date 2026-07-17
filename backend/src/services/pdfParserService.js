// src/services/pdfParserService.js

const { PDFParse } = require("pdf-parse");
const fs = require("fs").promises;

// Change parameter from 'filePath' to 'dataBuffer'
async function parsePDF(dataBuffer) {
    try {
        // We no longer need fs.readFile because we are passing the buffer directly from memory!
        const parser = new PDFParse({ data: dataBuffer }); // dataBuffer = file buffer
        const result = await parser.getText(); // getText() returns {text: string, numpages: number}
        await parser.destroy(); // destroy the parser, why? just to free up memory 
        return result.text.trim(); // return the trimmed text
    } catch (error) {
        throw new Error("PDF parsing failed: " + error.message); // throw the error to the caller
    }
}


module.exports = { parsePDF };
