// src/services/aiAgentService.js using OpenAI

const { OpenAI } = require("openai");
const { CustomError } = require("../utils/errors");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function analyzeResume(resumeText, jobDescription) {
    try {
        const prompt = `
        Analyze the resume text provided below and compare it with the job description.
        
        Resume Text:
        ${resumeText}
        
        Job Description:
        ${jobDescription}
        
        Provide a JSON response with the following fields:
        - score: Overall match percentage (0-100)
        - strengths: Key strengths and relevant experience
        - weaknesses: Areas where the candidate lacks experience
        - recommendations: Suggestions for improvement
        - missingKeywords: Keywords from the job description not found in the resume
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-5-mini-2025-08-07",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2,
        });

        return JSON.parse(response.choices[0].message.content);
    } catch (error) {
        throw new CustomError("AI analysis failed", 500);
    }
}

module.exports = { analyzeResume };