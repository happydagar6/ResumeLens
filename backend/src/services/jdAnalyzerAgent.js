// src/services/jdAnalyzerAgent.js
// LangChain-powered Job Description analyzer agent.
// Migrated from raw OpenAI SDK to LangChain in Phase 3.

const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { JsonOutputParser } = require("@langchain/core/output_parsers");
const { analyzerModel } = require("../config/langchain");
const { CustomError } = require("../utils/errors");
const { validateAIOutput } = require("./validationService");
const { z } = require("zod");

// Validation Schema
const jdAnalysisSchema = z.object({ // Zod schema for validating AI-generated job description analysis
    requiredSkills: z.array(z.string()).default([]), // Array of required skills
    niceToHaveSkills: z.array(z.string()).default([]), // Array of nice-to-have skills
    experienceLevel: z.enum(["junior", "mid", "senior", "lead"]).default("mid"), // Expected experience level
    keyResponsibilities: z.array(z.string()).default([]), // Array of key responsibilities
    qualifications: z.array(z.string()).default([]), // Array of qualifications
    roleType: z.string().optional(), // Optional role type
    industry: z.string().optional(), // Optional industry
}); // End of Zod schema

// ── Prompt Template ────────────────────────────────────────────────────────
const jdPrompt = ChatPromptTemplate.fromMessages([
    [
        "system",
        `You are an expert job description analyst. 
Extract structured information from job descriptions with precision.
Be specific with skills — write "React.js" not "JavaScript frameworks".
Only include information explicitly stated or strongly implied.
Always return valid JSON only.`,
    ],
    [
        "human",
        `Analyze the following job description and extract structured information.

Job Description:
{jobDescription}

Return a JSON object with these exact fields:
- requiredSkills: array of strings — skills explicitly required or strongly implied
- niceToHaveSkills: array of strings — skills mentioned as preferred, bonus, or nice-to-have
- experienceLevel: one of "junior", "mid", "senior", "lead" — based on years and seniority language
- keyResponsibilities: array of strings — main duties and responsibilities
- qualifications: array of strings — required degrees, certifications, or formal qualifications
- roleType: string — the general role category (e.g. "Frontend Developer", "Data Scientist")
- industry: string — the industry or domain if mentioned`,
    ],
]); // End of prompt template

// LangChain Chain
const jdChain = jdPrompt
    .pipe(analyzerModel)
    .pipe(new JsonOutputParser()); // End of LangChain chain

// ── Agent Function ────────────────────────────────────────────────────────
async function analyzeJD(jobDescription) {
    let lastError = null; // Store the last error encountered

    for(let attempt = 1; attempt <= 2; attempt++) { // Retry up to 2 times
        try {
            const parsed = await jdChain.invoke({ jobDescription }); // Invoke the LangChain chain

            const validation = validateAIOutput(parsed, jdAnalysisSchema); // Validate the AI's output
             if (!validation.valid) { // If validation fails
                console.error(
                    `JD analysis validation failed (attempt ${attempt}):`,
                    validation.errors
                );
                lastError = new CustomError("AI returned invalid JD analysis structure", 500);
                continue;
            }

            return validation.data; // Valid, structured JD analysis data
        } catch (error) {
            console.error(`JD analysis failed (attempt ${attempt}):`, error.message);
            lastError = error; // Store the last error
        }
    }
    throw lastError || new CustomError("JD analysis failed after multiple attempts", 500);
};

module.exports = { analyzeJD }; // End of module export