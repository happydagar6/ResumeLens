// src/config/langchain.js
// Centralized LangChain model instances for all AI agents.
// Each model is pre-configured for its specific task.
 const { ChatOpenAI } = require("@langchain/openai");

// ── Entity Extraction ──────────────────────────────────────────────────────
// Fast, low-temperature model. Extraction needs precision, not creativity.

const extractorModel = new ChatOpenAI({
    model: "gpt-4.1-mini-2025-04-14",
    temperature: 0.1,
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelKwargs: {
        response_format: { type: "json_object" },
    },
});

// ── Resume Scoring ─────────────────────────────────────────────────────────
// Slightly higher temperature — allows nuanced analysis without being wild.

const scorerModel = new ChatOpenAI({
    model: "gpt-4.1-mini-2025-04-14",
    temperature: 0.2,
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelKwargs: {
        response_format: { type: "json_object" },
    },
});

// ── Interview Question Generation ──────────────────────────────────────────
// Full model with high reasoning effort — questions need depth and creativity.

const questionModel = new ChatOpenAI({
    model: "gpt-4.1-mini-2025-04-14",
    temperature: 0.3,
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelKwargs: {
        response_format: { type: "json_object" },
    },
});

// ── JD Analysis ────────────────────────────────────────────────────────────
// Low temperature for consistent, factual extraction from job descriptions.
const analyzerModel = new ChatOpenAI({
    model: "gpt-4.1-mini-2025-04-14",
    temperature: 0,
    openAIApiKey: process.env.OPENAI_API_KEY,
    maxCompletionTokens: 5000,
    modelKwargs: {
        response_format: { type: "json_object" },
    },
});

const emailModel = new ChatOpenAI({
    model: "gpt-4.1-mini-2025-04-14",
    temperature: 0.4,
    openAIApiKey: process.env.OPENAI_API_KEY,
});

// ── Bias Detection ─────────────────────────────────────────────────────────
// temperature: 0 — detection must be deterministic. Same JD = same flags every time.
const biasModel = new ChatOpenAI({
    model: "gpt-4.1-mini-2025-04-14",
    temperature: 0,
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelKwargs: {
        response_format: { type: "json_object" },
    },
});

module.exports = { extractorModel, scorerModel, questionModel, analyzerModel, emailModel, biasModel };