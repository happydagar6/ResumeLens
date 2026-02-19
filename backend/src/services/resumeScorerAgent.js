// src/services/resumeScorerAgent.js
// LangChain-powered resume scoring agent.
// Phase 3 change: now accepts analyzedJD (from Phase 2) as 4th param
// for significantly more accurate scoring.

const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { JsonOutputParser } = require("@langchain/core/output_parsers");
const { scorerModel } = require("../config/langchain");
const { CustomError } = require("../utils/errors");
const { validateAIOutput, scoringSchema } = require("./validationService");

// ── Prompt Template ────────────────────────────────────────────────────────
// {resumeText}        — raw resume text
// {extractedEntities} — structured entities from Phase 1 entity extraction
// {jobDescription}    — original raw job description
// {analyzedJD}        — structured JD analysis from Phase 2 (or "Not available")
const scoringPrompt = ChatPromptTemplate.fromMessages([
    [
        "system",
        `You are a senior technical recruiter and resume evaluator. 
Score resumes objectively against job requirements. 
Be realistic with scores — a score of 70+ means a strong candidate.
Always return valid JSON only.`,
    ],
    [
        "human",
        `Score the following resume against the job description.

=== RESUME TEXT ===
{resumeText}

=== CANDIDATE'S EXTRACTED SKILLS & EXPERIENCE ===
{extractedEntities}

=== JOB DESCRIPTION (Raw) ===
{jobDescription}

=== JOB REQUIREMENTS (Structured Analysis) ===
{analyzedJD}

Return a JSON object with these exact fields:
- score: number 0-100 (overall match percentage)
- matchedSkills: array of strings (skills in resume that match job requirements)
- missingSkills: array of strings (required skills the candidate lacks)
- strengths: string (2-3 sentences on candidate's key strengths for this role)
- weaknesses: string (2-3 sentences on gaps or concerns)
- recommendation: one of "strong_yes", "yes", "maybe", "no", "strong_no"
- rationale: string (1-2 sentence explanation of the overall score)

Use the structured JD analysis (if available) to be precise about required vs nice-to-have skills.`,
    ],
]);

// ── LangChain Chain ────────────────────────────────────────────────────────
const scoringChain = scoringPrompt
    .pipe(scorerModel)
    .pipe(new JsonOutputParser());

// ── Main Function ──────────────────────────────────────────────────────────
// IMPORTANT: analyzedJD is the 4th parameter added in Phase 3.
// screeningController.js must pass job.analyzedJD as the 4th argument.
async function scoreResume(resumeText, jobDescription, extractedEntities, analyzedJD = null) {
    // Format analyzedJD for the prompt — gracefully handle if not yet available
    const analyzedJDText = analyzedJD
        ? JSON.stringify(analyzedJD, null, 2)
        : "Not available — score based on raw job description only.";

    let lastError = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const parsed = await scoringChain.invoke({
                resumeText,
                jobDescription,
                extractedEntities: JSON.stringify(extractedEntities, null, 2),
                analyzedJD: analyzedJDText,
            });

            const validation = validateAIOutput(parsed, scoringSchema);
            if (!validation.valid) {
                console.error(
                    `Resume scoring validation failed (attempt ${attempt}):`,
                    validation.errors
                );
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