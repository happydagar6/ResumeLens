// src/services/questionGeneratorAgent.js
// TODO: Implement with LangChain.js + LangGraph for multi-agent workflow
// This agent generates personalized interview questions based on:
// - Resume content
// - Job description
// - Screening results (matched/missing skills)

const { openai } = require("../config/ai");
const { CustomError } = require("../utils/errors");
const { validateAIOutput, questionsSchema } = require("./validationService");

async function generateInterViewQuestions(
  resumeText,
  jobDescription,
  screeningResult,
) {
  const prompt = `Generate 5-10 personalized interview questions for a candidate.
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

  let lastError = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4.1-2025-04-14",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        response_format: { type: "json_object" },
        max_completion_tokens: 8000,
        reasoning_effort: "high",
      });

      const parsed = JSON.parse(response.choices[0].message.content);

      // Validate against questions schema
      const validation = validateAIOutput(parsed, questionsSchema);
      if (!validation.valid) {
        console.error(
          `Question generation validation failed (attempt ${attempt}):`,
          validation.errors,
        );
        lastError = new CustomError("AI returned invalid question structure", 500);
        continue;
      }
      return validation.data; // { questions: [...] }
    } catch (error) {
        console.error(`Question generation attempt ${attempt} failed:`, error.message);
        lastError = error;
    }
  }
  throw lastError || new CustomError("Question generation failed after retries", 500);
}

module.exports = { generateInterViewQuestions };
