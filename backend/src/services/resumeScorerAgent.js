// src/services/resumeScorerAgent.js
// TODO: Implement with LangChain.js + LangGraph for multi-agent workflow
// This agent scores a resume against a job description:
// - Overall match percentage (0-100)
// - Matched skills
// - Missing skills
// - Strengths & weaknesses
// - Recommendation

const { openai } = require("../config/ai");
const { CustomError } = require("../utils/errors");

async function scoreResume(resumeText, jobDescription, extractedEntities) {
    try {
        const prompt = `Score the following resume against the job description.

Resume Text:
${resumeText}

Extracted Entities:
${JSON.stringify(extractedEntities, null, 2)}

Job Description:
${jobDescription}

Return a JSON object with:
- score: number 0-100 (overall match percentage)
- matchedSkills: array of strings
- missingSkills: array of strings
- strengths: string (key strengths summary)
- weaknesses: string (areas of concern)
- recommendation: one of "strong_yes", "yes", "maybe", "no", "strong_no"
- rationale: string (brief explanation of the score)`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2,
            response_format: { type: "json_object" },
        });

        return JSON.parse(response.choices[0].message.content);
    } catch (error) {
        throw new CustomError("Resume scoring failed", 500);
    }
}

module.exports = { scoreResume };
