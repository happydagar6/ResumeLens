// src/services/biasDetectionAgent.js
// LangChain-powered bias detection agent for job descriptions.
// Scans for gendered, ageist, culturally coded, and exclusionary language.
// Returns a structured report: biasScore (0-100), flagged terms, and neutral alternatives.

const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { JsonOutputParser } = require("@langchain/core/output_parsers");
const { biasModel } = require("../config/langchain");
const { CustomError } = require("../utils/errors");
const { validateAIOutput, biasDetectionSchema } = require("./validationService");

// ── Prompt ─────────────────────────────────────────────────────────────────────
// System: Frame the AI as a DEI expert — this gets better results than "recruiter".
// Human:  Feed both description + requirements as one block.
//         Instruct the AI to output very specific JSON.

const biasPrompt = ChatPromptTemplate.fromMessages([
    [
        "system",
        `You are an expert in Diversity, Equity & Inclusion (DEI) with deep knowledge of 
unconscious bias in hiring language. You identify language in job descriptions that
may unintentionally discourage qualified candidates from applying.

Categories you detect:
- gender: language that codes as masculine/feminine (e.g. "rockstar", "ninja", "nurturing")
- age: language that implies preference for younger/older workers (e.g. "recent graduate", "digital native", "5-7 years only")
- culture: culturally specific idioms or references that exclude non-native speakers
- socioeconomic: language implying class privilege (e.g. "must own a car", "unpaid internship welcome")
- ability: language implying physical/neurological requirements not inherent to the role

biasScore guide:
- 90-100: Very neutral — few or no biased terms
- 70-89: Mostly neutral — 1-2 minor issues
- 50-69: Moderate bias — 3-5 issues worth addressing
- 30-49: Significant bias — 6-10 issues, likely deterring candidates
- 0-29: High bias — many exclusionary terms, serious DEI risk

Always return valid JSON only.`,
    ],
    [
        "human",
        `Analyze the following job description for biased language.

=== JOB DESCRIPTION ===
{jobText}

Return a JSON object with these exact fields:
- biasScore: number 0-100 (100 = completely neutral, 0 = maximally biased)
- flagCount: integer — total number of biased terms found
- flags: array of objects, each with:
    - term: string — the exact biased phrase as it appears in the text
    - context: string — the full sentence or clause containing the term
    - category: one of "gender", "age", "culture", "socioeconomic", "ability"
    - suggestion: string — a neutral replacement phrase
    - severity: one of "low", "medium", "high" (how much this term might deter candidates)
- summary: string — 1-2 sentence overall assessment of the JD's inclusivity

Important: if no bias is found, return an empty flags array and biasScore of 95-100.
Do NOT invent flags that don't exist in the text.`,
    ],
]); // end of prompt template

// ── LangChain Chain ────────────────────────────────────────────────────────────
// biasModel → JsonOutputParser: forces valid JSON output
const biasChain = biasPrompt
    .pipe(biasModel)
    .pipe(new JsonOutputParser()); // end of LangChain chain

// ── Main Function ──────────────────────────────────────────────────────────────
// jobText: combined description + requirements (we pass both to catch all bias)
// Returns validated { biasScore, flagCount, flags, summary }
async function detectBias(jobText) {
    let lastError = null; // Store the last error encountered

    // 2-attempt retry loop — same pattern as all other agents in this project
    for (let attempt = 1; attempt <= 2; attempt++) { // Retry up to 2 times
        try {
            const parsed = await biasChain.invoke({ jobText }); // Invoke the LangChain chain

            const validation = validateAIOutput(parsed, biasDetectionSchema);
            if (!validation.valid) {
                console.error(
                    `Bias detection validation failed (attempt ${attempt}):`,
                    validation.errors
                );
                lastError = new CustomError("AI returned invalid bias detection structure", 500);
                continue; // retry
            }

            // Ensure flagCount matches the actual array length (AI sometimes miscounts)
            const result = validation.data;
            result.flagCount = result.flags.length;

            console.log(`[BiasAgent] Score: ${result.biasScore}, Flags: ${result.flagCount}`);
            return result; // Valid, bias detection data
        } catch (error) {
            console.error(`Bias detection attempt ${attempt} failed:`, error.message);
            lastError = error; // Store the last error
        }
    }
    throw lastError || new CustomError("Bias detection failed after retries", 500);
}

module.exports = { detectBias }; // end of module export