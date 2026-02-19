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
const jdAnalysisSchema = z.object({
    requiredSkills: z.array(z.string()).default([]),
    niceToHaveSkills: z.array(z.string()).default([]),
    experienceLevel: z.enum(["junior", "mid", "senior", "lead"]).default("mid"),
    keyResponsibilities: z.array(z.string()).default([]),
    qualifications: z.array(z.string()).default([]),
    roleType: z.string().optional(),
    industry: z.string().optional(),
});

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
]);


// LangChain Chain
const jdChain = jdPrompt
    .pipe(analyzerModel)
    .pipe(new JsonOutputParser());

// ── Agent Function ────────────────────────────────────────────────────────
async function analyzeJD(jobDescription) {
    let lastError = null;

    for(let attempt = 1; attempt <= 2; attempt++) {
        try {
            const parsed = await jdChain.invoke({ jobDescription });

            const validation = validateAIOutput(parsed, jdAnalysisSchema);
             if (!validation.valid) {
                console.error(
                    `JD analysis validation failed (attempt ${attempt}):`,
                    validation.errors
                );
                lastError = new CustomError("AI returned invalid JD analysis structure", 500);
                continue;
            }

            return validation.data;
        } catch (error) {
            console.error(`JD analysis failed (attempt ${attempt}):`, error.message);
            lastError = error;
        }
    }
    throw lastError || new CustomError("JD analysis failed after multiple attempts", 500);
};

module.exports = { analyzeJD };