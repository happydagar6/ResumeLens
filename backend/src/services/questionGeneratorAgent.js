// src/services/questionGeneratorAgent.js
// TODO: Implement with LangChain.js + LangGraph for multi-agent workflow
// This agent generates personalized interview questions based on:
// - Resume content
// - Job description
// - Screening results (matched/missing skills)

const { openai } = require("../config/ai");
const { CustomError } = require("../utils/errors");

async function generateInterviewQuestions(resumeText, jobDescription, screeningResult) {
    try {
        const prompt = `Generate 5-10 personalized interview questions for a candidate.

Resume:
${resumeText}

Job Description:
${jobDescription}

Screening Score: ${screeningResult.overallScore}%
Matched Skills: ${screeningResult.matchedSkills?.join(", ") || "N/A"}
Missing Skills: ${screeningResult.missingSkills?.join(", ") || "N/A"}

Return a JSON object with a "questions" array, each containing:
- question: the interview question string
- category: one of "technical", "behavioral", "situational", "experience", "general"
- difficulty: one of "easy", "medium", "hard"

Focus questions on:
1. Verifying claimed skills and experience
2. Probing missing skills noted in screening
3. Role-specific technical depth
4. Cultural fit and soft skills`;

        const response = await openai.chat.completions.create({
            model: "gpt-4.1-mini-2025-04-14",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.4,
            response_format: { type: "json_object" },
        });

        return JSON.parse(response.choices[0].message.content);
    } catch (error) {
        throw new CustomError("Question generation failed", 500);
    }
}

module.exports = { generateInterviewQuestions };
