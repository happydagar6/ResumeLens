// src/services/entityExtractorAgent.js
// LangChain-powered entity extraction agent.
// Uses: ChatPromptTemplate → ChatOpenAI → JsonOutputParser → Zod validation

const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { JsonOutputParser } = require("@langchain/core/output_parsers");
const { extractorModel } = require("../config/langchain");
const { CustomError } = require("../utils/errors");
const { validateAIOutput, entityExtractionSchema } = require("./validationService");


// ── Prompt Template ────────────────────────────────────────────────────────
// System message sets the AI's role.
// Human message contains the resume text (injected via {resumeText}).

const extractionPrompt = ChatPromptTemplate.fromMessages([
    [
        "system",
        `You are an expert resume parser. Your job is to extract structured information 
from resume text with high accuracy. Always return valid JSON only.`,
    ],
    [
        "human",
        `Extract structured information from the following resume text.

Resume:
{resumeText}

Return a JSON object with these exact fields:
- skills: array of strings (technical and soft skills)
- experience: array of objects with {{ role, company, duration, description }}
- education: array of objects with {{ degree, institution, year }}
- certifications: array of strings
- contactInfo: object with {{ name, email, phone, location }}

Include only information explicitly present in the resume. Do not invent or assume anything.`,
    ],
]);


// ── LangChain Chain (LCEL) ──────────────────────────────────────────────────
// prompt → model → JSON parser
// .pipe() chains the steps: each step's output becomes the next step's input.

const extractionChain = extractionPrompt.pipe(extractorModel).pipe(new JsonOutputParser());

// ── Main Extraction Function ──────────────────────────────────────────────────
async function extractEntities(resumeText) {
    let lastError = null; // Store the last error encountered

    for (let attempt = 1; attempt <= 3; attempt++) { // Retry up to 3 times
        try {
            // invoke() runs the entire chain: format prompt -> call AI -> parse JSON
            const parsed = await extractionChain.invoke({ resumeText });

            // Validate the AI's output against our Zod schema
            const validation = validateAIOutput(parsed, entityExtractionSchema); // Validate the AI's output
            if(!validation.valid) { // If validation fails
                console.error(
                    `Entity extraction validation failed on attempt ${attempt}:`, // Log validation errors
                    validation.errors
                );
                lastError = new CustomError("Ai returned invalid entity structure", 500); // Store the last error
                continue; // retry
            }
            return validation.data; // valid, structured entity data
        } catch (error) {
            console.error(`Entity extraction error on attempt ${attempt}:`, error);
            lastError = error;
        }
    }
    // After 3 attempts, throw the last error encountered
    throw lastError || new CustomError("Unknown error during entity extraction", 500);
};

module.exports = { extractEntities };