// src/services/resumeScorerAgent.js

const { openai } = require("../config/ai");
const { CustomError } = require("../utils/errors");
const { validateAIOutput, scoringSchema } = require("./validationService");

async function scoreResume(resumeText, jobDescription, extractedEntities) {
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

    let lastError = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const response = await openai.chat.completions.create({
                model: "gpt-4.1-mini-2025-04-14",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.2,
                response_format: { type: "json_object" },
            });

            const parsed = JSON.parse(response.choices[0].message.content);

            // Validate against scoring schema
            const validation = validateAIOutput(parsed, scoringSchema);
            if (!validation.valid) {
                console.error(`Resume scoring validation failed (attempt ${attempt}):`, validation.errors);
                lastError = new CustomError("AI returned invalid scoring structure", 500);
                continue;
            }

            return validation.data;
        } catch (error) {
            console.error(`Resume scoring attempt ${attempt} failed:`, error.message);
            lastError = error;
        }
    }

    throw lastError || new CustomError("Resume scoring failed after retries", 500);
}

module.exports = { scoreResume };