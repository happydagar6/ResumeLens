// src/services/questionGeneratorAgent.js
// LangChain-powered interview question generator.
// Uses the most powerful model with high reasoning effort.
// Generates personalized questions based on resume + job + screening results.


const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { JsonOutputParser } = require("@langchain/core/output_parsers");
const { questionModel } = require("../config/langchain");
const { CustomError } = require("../utils/errors");
const { validateAIOutput, questionGenerationSchema, questionsSchema } = require("./validationService");


// ── Prompt Template ────────────────────────────────────────────────────────
// Role-specific system prompt + rich human prompt with screening context.
const questionPrompt = ChatPromptTemplate.fromMessages([
    [
        "system",
        `You are an expert technical interviewer and hiring coach with 15+ years of experience. 
Your interview questions are:
- Targeted to the candidate's specific resume and the role requirements
- Designed to uncover genuine depth of knowledge, not surface-level answers
- Balanced across technical, behavioral, and situational dimensions
- Calibrated to the candidate's apparent experience level
Always return valid JSON only.`,
    ],
    [
        "human",
        `Generate 7-10 personalized interview questions for the following candidate.

=== JOB DESCRIPTION ===
{jobDescription}

=== SCREENING SUMMARY ===
Overall Score: {score}%
Matched Skills: {matchedSkills}
Missing Skills: {missingSkills}
Recruiter Notes: {rationale}

Generate questions that:
1. Verify the depth of their MATCHED skills (don't assume competence — probe it)
2. Assess their ability to LEARN or WORK AROUND their missing skills
3. Explore role-specific technical scenarios relevant to this position
4. Evaluate soft skills, collaboration, and problem-solving approach
5. Surface any red flags or gaps from the screening result

Return a JSON object with a "questions" array, where each item contains:
- question: the full interview question string (specific, open-ended)
- category: one of "technical", "behavioral", "situational", "experience", "general"  
- difficulty: one of "easy", "medium", "hard"

Aim for a mix: ~40% technical, ~30% behavioral, ~30% situational/experience.`,
    ],
]);


// ── LangChain Chain
const questionChain = questionPrompt
.pipe(questionModel) // Invoke the LangChain chain
.pipe(new JsonOutputParser()); // End of LangChain chain

// ── Main Function
async function generateInterviewQuestions(resumeText, jobDescription, screeningResult) {
  // Format screening data for the prompt
  const score = screeningResult.overallScore ?? "N/A"; // Format screening data for the prompt
  const matchedSkills = screeningResult.matchedSkills?.join(", ") || "None identified"; // Format screening data for the prompt
  const missingSkills = screeningResult.missingSkills?.join(", ") || "None identified"; // Format screening data for the prompt
  const rationale = screeningResult.rationale || screeningResult.strengths || "No additional notes"; // Format screening data for the prompt

  let lastError = null;

  for (let attempt = 1; attempt <= 2; attempt++) { // Retry up to 2 times
    try {
      const parsed = await questionChain.invoke({ // Invoke the LangChain chain
        jobDescription, // Format screening data for the prompt
        score, // Format screening data for the prompt
        matchedSkills, // Format screening data for the prompt
        missingSkills, // Format screening data for the prompt
        rationale, // Format screening data for the prompt
      }); // AI call with formatted prompt

      const validation = validateAIOutput(parsed, questionsSchema);
      if (!validation.valid) {
        console.error(
          `Question generation validation failed on attempt ${attempt}:`,
          validation.errors
        );
        lastError = new CustomError("AI returned invalid question structure", 500);
        continue;
      }

      return validation.data; // valid, structured questions
    } catch (error) {
      console.error(`Question generation error on attempt ${attempt}:`, error);
      lastError = error;
    }
  }

  // After retries, throw the last error encountered
  throw lastError || new CustomError("Unknown error during question generation", 500);
};

module.exports = { generateInterviewQuestions };