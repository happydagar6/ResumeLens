// src/services/entityExtractorAgent.js

const { openai } = require("../config/ai");
const { CustomError } = require("../utils/errors");
const { validateAIOutput, entityExtractionSchema } = require("./validationService");

async function extractEntities(resumeText) {
    const prompt = `Extract structured information from the following resume text.

Resume:
${resumeText}

Return a JSON object with these fields:
- skills: array of strings (technical and soft skills)
- experience: array of objects with { role, company, duration, description }
- education: array of objects with { degree, institution, year }
- certifications: array of strings
- contactInfo: object with { name, email, phone, location }`;

    // Try up to 2 times (original + 1 retry)
    let lastError = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const response = await openai.chat.completions.create({
                model: "gpt-4.1-mini-2025-04-14",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.1,
                response_format: { type: "json_object" },
            });

            const parsed = JSON.parse(response.choices[0].message.content);

            // Validate AI output against our Zod schema
            const validation = validateAIOutput(parsed, entityExtractionSchema);
            if (!validation.valid) {
                console.error(`Entity extraction validation failed (attempt ${attempt}):`, validation.errors);
                lastError = new CustomError("AI returned invalid entity structure", 500);
                continue; // Retry
            }

            return validation.data; // Returns the cleaned, validated data
        } catch (error) {
            console.error(`Entity extraction attempt ${attempt} failed:`, error.message);
            lastError = error;
        }
    }

    // Both attempts failed
    throw lastError || new CustomError("Entity extraction failed after retries", 500);
}

module.exports = { extractEntities };