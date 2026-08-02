// src/services/candidateChatAgent.js
// This AI agent acts as a "co-pilot" for reviewing a specific candidate.
// It answers questions based ONLY on the resume and job description provided.
// It uses chat history so it remembers earlier messages in the conversation.

const { ChatPromptTemplate, MessagesPlaceholder } = require("@langchain/core/prompts");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { HumanMessage, AIMessage } = require("@langchain/core/messages");
const { chatModel } = require("../config/langchain");
const { CustomError } = require("../utils/errors");

// ── Prompt ──────────────────────────────────────────────────────────────────
// The system message "frames" who the AI is. We restrict it to ONLY the resume.
// MessagesPlaceholder is a special slot where the full chat history will be injected.
// The human turn at the bottom sends the user's current question.

const chatPrompt = ChatPromptTemplate.fromMessages([
    [
        "system",
        `You are a smart hiring assistant helping a recruiter evaluate a specific candidate.
You have access to the candidate's full resume text and the job they applied for.
Answer questions in a conversational, concise manner (2-4 sentences max per answer).

IMPORTANT RULES:
- Answer ONLY based on the resume and job data provided below.
- Do NOT make up information that is not in the resume.
- If the answer is not in the resume, say "I don't have that information in this candidate's resume."
- Be specific — reference actual skills, companies, or dates from the resume when possible.

=== JOB TITLE ===
{jobTitle}

=== JOB DESCRIPTION ===
{jobDescription}

=== CANDIDATE RESUME ===
{resumeText}`,
    ],
    // This is where the full conversation history gets injected on every call.
    // The frontend sends it; the backend passes it here.
    new MessagesPlaceholder("chatHistory"),
    [
        "human",
        "{userQuestion}", // The user's current new message
    ],
]);

// ── LangChain Chain ──────────────────────────────────────────────────────────
// chatModel → StringOutputParser: returns a plain text string (not JSON)
const chatChain = chatPrompt
    .pipe(chatModel)
    .pipe(new StringOutputParser());

// ── Helper: Convert Frontend History Format → LangChain Message Objects ──────
// The frontend sends: [{ role: "user", content: "..." }, { role: "assistant", content: "..." }]
// LangChain needs: [new HumanMessage("..."), new AIMessage("...")]
function convertHistory(history = []) { // convert frontend history format to LangChain message objects
    return history.map((msg) => { // map over the history
        if (msg.role === "user") return new HumanMessage(msg.content); // if user message, return new HumanMessage
        if (msg.role === "assistant") return new AIMessage(msg.content); // if assistant message, return new AIMessage
        // Skip any unknown message types safely
        return null;
    }).filter(Boolean); // Remove nulls
}

// ── Main Function ────────────────────────────────────────────────────────────
// jobTitle: string — e.g. "Senior Backend Engineer"
// jobDescription: string — the raw job description text
// resumeText: string — the candidate's full parsed resume text
// history: array of { role, content } objects from the frontend
// userQuestion: string — the user's latest message
async function chatAboutCandidate({ jobTitle, jobDescription, resumeText, history, userQuestion }) {
    if (!userQuestion?.trim()) { // validate user question
        throw new CustomError("Question cannot be empty", 400); // throw error if question is empty
    }

    try { // Handle errors
        // Convert the simple frontend history format to LangChain message objects
        const chatHistory = convertHistory(history);

        // Invoke the LangChain chain with all the context
        const answer = await chatChain.invoke({
            jobTitle,
            jobDescription,
            resumeText,
            chatHistory,
            userQuestion,
        });

        console.log(`[ChatAgent] Answered question: "${userQuestion.substring(0, 50)}..."`);
        return answer; // Plain text string
    } catch (error) {
        console.error("[ChatAgent] Failed:", error.message);
        throw new CustomError("AI chat failed. Please try again.", 500);
    }
}

module.exports = { chatAboutCandidate }; // end of module export