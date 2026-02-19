// src/services/validationService.js

const { z } = require("zod");

// Zod schemas for validating AI output structure

const entityExtractionSchema = z.object({
    skills: z.array(z.string()).default([]),
    experience: z.array(z.object({
        role: z.string().optional(),
        company: z.string().optional(),
        duration: z.string().optional(),
        description: z.string().optional(),
    })).default([]),
    education: z.array(z.object({
        degree: z.string().optional(),
        institution: z.string().optional(),
        year: z.string().optional(),
    })).default([]),
    certifications: z.array(z.string()).default([]),
    contactInfo: z.object({
        name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        location: z.string().optional(),
    }).optional(),
});

const scoringSchema = z.object({
    score: z.number().min(0).max(100),
    matchedSkills: z.array(z.string()).default([]),
    missingSkills: z.array(z.string()).default([]),
    strengths: z.string().default(""),
    weaknesses: z.string().default(""),
    recommendation: z.enum(["strong_yes", "yes", "maybe", "no", "strong_no"]).default("maybe"),
    rationale: z.string().optional(),
});

const questionsSchema = z.object({
    questions: z.array(z.object({
        question: z.string(),
        category: z.enum(["technical", "behavioral", "situational", "experience", "general"]).default("general"),
        difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
    })),
});

function validateAIOutput(data, schema) {
    const result = schema.safeParse(data);
    if (!result.success) {
        console.error("AI output validation failed:", result.error.issues);
        return { valid: false, errors: result.error.issues, data: null };
    }
    return { valid: true, errors: null, data: result.data };
}

module.exports = {
    entityExtractionSchema,
    scoringSchema,
    questionsSchema,
    validateAIOutput,
};
