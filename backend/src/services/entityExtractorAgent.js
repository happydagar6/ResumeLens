// src/services/entityExtractorAgent.js
// TODO: Implement with LangChain.js + LangGraph for multi-agent workflow
// This agent extracts structured entities from resume text:
// - Skills (technical & soft)
// - Work experience (roles, companies, duration)
// - Education (degrees, institutions, years)
// - Certifications
// - Contact info

const { openai } = require("../config/ai");
const { CustomError } = require("../utils/errors");

async function extractEntities(resumeText) {
    try {
        const prompt = `Extract structured information from the following resume text.

Resume:
${resumeText}

Return a JSON object with these fields:
- skills: array of strings (technical and soft skills)
- experience: array of objects with { role, company, duration, description }
- education: array of objects with { degree, institution, year }
- certifications: array of strings
- contactInfo: object with { name, email, phone, location }`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
            response_format: { type: "json_object" },
        });

        return JSON.parse(response.choices[0].message.content);
    } catch (error) {
        throw new CustomError("Entity extraction failed", 500);
    }
}

module.exports = { extractEntities };
