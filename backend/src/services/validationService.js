// src/services/validationService.js
const { z } = require("zod");

// Zod schemas for validating AI output structure

const entityExtractionSchema = z.object({
    skills: z.array(z.string()).default([]), // Array of strings
    experience: z.array(z.object({
        role: z.string().nullable().optional(), // String
        company: z.string().nullable().optional(), // String
        duration: z.string().nullable().optional(), // String
        description: z.union([z.string(), z.array(z.string())]).nullable().optional(), // String or array of strings
    })).default([]),
    education: z.array(z.object({
        degree: z.string().nullable().optional(), // String
        institution: z.string().nullable().optional(), // String
        year: z.string().nullable().optional(), // String
    })).default([]),
    certifications: z.array(z.string()).default([]), // Array of strings
    contactInfo: z.object({
        name: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        location: z.string().nullable().optional(),
    }).nullable().optional(),
});


// Scoring Schema
const scoringSchema = z.object({
    score: z.number().min(0).max(100), // Score between 0 and 100
    scoreBreakdown: z.object({
        technical: z.object({ score: z.number().min(0).max(100), rationale: z.string() }), // Technical score and rationale
        experience: z.object({ score: z.number().min(0).max(100), rationale: z.string() }), // Experience score and rationale
        culture: z.object({ score: z.number().min(0).max(100), rationale: z.string() })
    }).optional(),
    matchedSkills: z.array(z.string()).default([]), // Array of strings
    missingSkills: z.array(z.string()).default([]), // Array of strings
    strengths: z.string().default(""), // String
    weaknesses: z.string().default(""), // String
    recommendation: z.enum(["strong_yes", "yes", "maybe", "no", "strong_no"]).default("maybe"), // Enum
    rationale: z.string().optional(), // String
});


// Bias detection schema for analyzing job descriptions and screening results
const biasDetectionSchema = z.object({
    biasScore: z.number().min(0).max(100),
    flagCount: z.number().int().min(0),
    flags: z.array(
        z.object({
            term: z.string(),
            context: z.string().optional().default(""),
            category: z.enum(["gender", "age", "culture", "socioeconomic", "ability"]),
            suggestion: z.string(),
            severity: z.enum(["low", "medium", "high"]),
        })
    ).default([]),
    summary: z.string().default(""),
});


// Questions Schema
const questionsSchema = z.object({
    questions: z.array(z.object({
        question: z.string(),
        category: z.enum(["technical", "behavioral", "situational", "experience", "general"]).default("general"),
        difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
    })),
});

// Helper function to validate AI output structure
function validateAIOutput(data, schema) {
    const result = schema.safeParse(data);
    if (!result.success) { // Error handling
        console.error("AI output validation failed:", result.error.issues); // Error message
        return { valid: false, errors: result.error.issues, data: null };
    }
    return { valid: true, errors: null, data: result.data };
}

// Helper function to verify matched skills in text
function verifyMatchedSkillsInText(matchedSkills, resumeText) {
    const flags = []; // Array of strings

    if (!matchedSkills || matchedSkills.length === 0) return flags; // If no matched skills, return empty array
    if (!resumeText || resumeText.trim() === "") {
        flags.push("SKILL_CHECK_SKIPPED: Resume text is empty — cannot verify matched skills");
        return flags;
    }

    // Convert resume text to lowercase
    const lowerText = resumeText.toLowerCase();

    // Loop through matched skills
    for (const skill of matchedSkills) {
        if (!skill || typeof skill !== "string") continue;

        // Convert skill to lowercase
        const lowerSkill = skill.toLowerCase().trim();

        // Strategy 1: Direct substring match
        if (lowerText.includes(lowerSkill)) continue;

        // Strategy 2: Try the first "word" of the skill
        // e.g. "React.js" → try "react", "Node.js" → try "node"
        const firstWord = lowerSkill.split(/[.\s\/\-]/)[0];
        if (firstWord && firstWord.length >= 3 && lowerText.includes(firstWord)) continue;

        // Strategy 3: For multi-word skills like "REST APIs", try each word >= 4 chars
        const words = lowerSkill.split(/\s+/).filter((w) => w.length >= 4);
        if (words.length > 0 && words.some((w) => lowerText.includes(w))) continue;

        // None of the strategies found it — flag it
        flags.push(
            `SKILL_NOT_FOUND: "${skill}" is listed as matched but was not found in the resume text`
        );
    }

    // Return array of flags
    return flags;
}

// CHECK 2: Score Consistency
// Verify the numerical score is consistent with the matched/missing skill ratio.
// Also check the recommendation label aligns with the score number.
//
// Logic:
//   - If we have skill data, derive an expected score range from match ratio
//   - Allow a ±30 point tolerance (AI weighs experience, education, etc.)
//   - Cross-check recommendation vs score thresholds
function verifyScoreConsistency(scoringResult) {
    const flags = [];
    const { score, matchedSkills, missingSkills, recommendation } = scoringResult;

    // ── Skill ratio vs score ──────────────────────────────────────────────────
    const totalSkills = (matchedSkills?.length || 0) + (missingSkills?.length || 0); // Total number of skills

    if (totalSkills >= 3) { // Only run this check if there are enough data points to be meaningful
        const matchRatio = (matchedSkills?.length || 0) / totalSkills; // Ratio of matched skills to total skills
        const expectedCenter = matchRatio * 100; // Expected center score based on match ratio
        const tolerance = 30; // Tolerance for score deviation

        if (score < expectedCenter - tolerance || score > expectedCenter + tolerance) { // Check if score is outside expected range
            flags.push(
                `SCORE_SKILL_MISMATCH: Score ${score} is outside expected range ` +
                `[${Math.round(expectedCenter - tolerance)}–${Math.round(expectedCenter + tolerance)}] ` +
                `based on skill match ratio ${matchedSkills.length}/${totalSkills} (${Math.round(matchRatio * 100)}%)`
            );
        }
    }

    // ── Recommendation vs score ───────────────────────────────────────────────
    // "strong_yes" with a very low score is contradictory
    if (score < 45 && (recommendation === "yes" || recommendation === "strong_yes")) {
        flags.push(
            `RECOMMENDATION_MISMATCH: Score ${score} is low (<45) but recommendation is "${recommendation}"`
        );
    }

    // "strong_no" with a very high score is contradictory
    if (score >= 80 && (recommendation === "no" || recommendation === "strong_no")) { // Check if score is too high for "strong_no" recommendation
        flags.push(
            `RECOMMENDATION_MISMATCH: Score ${score} is high     (≥80) but recommendation is "${recommendation}"`
        );
    }

    // "strong_yes" should require a high score
    if (recommendation === "strong_yes" && score < 75) { // Check if score is too low for "strong_yes" recommendation
        flags.push(
            `STRONG_YES_LOW_SCORE: Recommendation is "strong_yes" but score is only ${score} (<75)`
        );
    }
    // Return array of flags
    return flags;
}

// CHECK 3: Suspicious Pattern Detection
// Flag patterns that suggest the AI was uncertain, confused, or produced
// a low-quality output rather than a genuine assessment.
function detectSuspiciousPatterns(scoringResult) { // Detect suspicious patterns in scoring results
    const flags = []; // Array of flags
    const { score, matchedSkills, missingSkills } = scoringResult; // Destructure scoring results

    // Exactly 50 is a classic AI "I don't know, I'll split the difference" default
    if (score === 50) { // Check if score is exactly 50
        flags.push(
            "SUSPICIOUS_SCORE_50: Score is exactly 50 — this is a common AI default when uncertain"
        );
    }

    // Score of 0 or 100 is almost always wrong
    if (score === 0) {
        flags.push("SUSPICIOUS_SCORE_0: Score is exactly 0 — likely an AI error");
    }
    if (score === 100) {
        flags.push("SUSPICIOUS_SCORE_100: Score is exactly 100 — extremely rare, verify manually");
    }

    // Both skill arrays empty but score is non-zero — AI scored without evidence
    if (
        (!matchedSkills || matchedSkills.length === 0) &&
        (!missingSkills || missingSkills.length === 0) &&
        score > 0
    ) {
        flags.push(
            `EMPTY_SKILL_ARRAYS: Score is ${score} but both matchedSkills and missingSkills ` +
            `are empty — AI scored without identifying any specific skills`
        );
    }

    // Very high score with many missing skills is contradictory
    if (score >= 90 && missingSkills && missingSkills.length >= 5) {
        flags.push(
            `HIGH_SCORE_MANY_MISSING: Score ${score} (≥90) but ${missingSkills.length} skills ` +
            `are listed as missing — verify this result manually`
        );
    }

    // Very long skill lists — could indicate the AI is padding
    if (matchedSkills && matchedSkills.length > 20) {
        flags.push(
            `EXCESSIVE_MATCHED_SKILLS: ${matchedSkills.length} matched skills listed — ` +
            `possible AI padding, verify the list`
        );
    }

    // Return array of flags
    return flags;
}

// ── Master cross-validation function ─────────────────────────────────────────
// Called by the validateResults node in screeningGraph.js.
// Takes the full AI scoring result + raw resume text.
// Returns { flags, passed, flagCount } — always returns, never throws.
function crossValidateScoringResult(scoringResult, resumeText) { // Cross-validate scoring results
    try { // Try to validate scoring results
        const skillFlags = verifyMatchedSkillsInText(
            scoringResult.matchedSkills || [],
            resumeText
        ); // Verify matched skills
        const consistencyFlags = verifyScoreConsistency(scoringResult); // Verify score consistency
        const suspiciousFlags = detectSuspiciousPatterns(scoringResult); // Detect suspicious patterns

        const allFlags = [...skillFlags, ...consistencyFlags, ...suspiciousFlags]; // Combine all flags

        return {
            flags: allFlags,
            passed: allFlags.length === 0,
            flagCount: allFlags.length,
        }; // Return validation results
    } catch (error) { // Catch validation errors
        // Should never throw but just in case
        return {
            flags: [`VALIDATION_ERROR: Validation itself threw — ${error.message}`], // Return error flags
            passed: false,
            flagCount: 1,
        };
    }
}

module.exports = {
    entityExtractionSchema,
    scoringSchema,
    questionsSchema,
    validateAIOutput,
    crossValidateScoringResult,
    biasDetectionSchema,
};
