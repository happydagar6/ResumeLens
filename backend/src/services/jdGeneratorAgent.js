const { chatModel } = require("../config/langchain");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { z } = require("zod");

// Define the exact JSON structure we want the AI to return
const jdSchema = z.object({
  description: z.string().describe("A professional, 2-3 paragraph job description."),
  requirements: z.string().describe("A bulleted list of requirements and qualifications."),
  skills: z.array(z.string()).describe("An array of 5-10 key technical and soft skills (e.g., ['React', 'Node.js', 'Leadership'])."),
});

// Create a strict JSON-enforced model
const jdGeneratorModel = chatModel.withStructuredOutput(jdSchema);

const systemPrompt = `You are an expert technical recruiter and HR copywriter.
Your task is to write a highly compelling, professional Job Description.
You will be provided with the Job Title, Company Name, and (optionally) the Seniority or Type of role.

Follow these rules:
1. Make the description engaging and highlight why someone would want to work at this company.
2. The requirements should be realistic and clearly formatted with bullet points.
3. The skills should be specific keywords that an ATS would look for.
4. Keep it concise but thorough.

Return the output strictly in the requested JSON format.`;

const prompt = ChatPromptTemplate.fromMessages([
  ["system", systemPrompt],
  ["human", "Title: {title}\nCompany: {company}"],
]);

/**
 * Generates a structured Job Description.
 * @param {string} title - e.g., "Senior React Developer"
 * @param {string} company - e.g., "Acme Corp"
 * @returns {Promise<Object>} { description, requirements, skills }
 */
async function generateJobDescription(title, company) {
  const chain = prompt.pipe(jdGeneratorModel);
  const response = await chain.invoke({ title, company });
  return response;
}

module.exports = { generateJobDescription };