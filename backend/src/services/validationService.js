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

function verifyMatchedSkillsInText(matchedSkills, resumeText) {
    const flags = [];

    if (!matchedSkills || matchedSkills.length === 0) return flags;
    if (!resumeText || resumeText.trim() === "") {
        flags.push("SKILL_CHECK_SKIPPED: Resume text is empty — cannot verify matched skills");
        return flags;
    }

    const lowerText = resumeText.toLowerCase();

    for (const skill of matchedSkills) {
        if (!skill || typeof skill !== "string") continue;

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
    const totalSkills = (matchedSkills?.length || 0) + (missingSkills?.length || 0);

    if (totalSkills >= 3) {
        // Only run this check if there are enough data points to be meaningful
        const matchRatio = (matchedSkills?.length || 0) / totalSkills;
        const expectedCenter = matchRatio * 100;
        const tolerance = 30;

        if (score < expectedCenter - tolerance || score > expectedCenter + tolerance) {
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
    if (score >= 80 && (recommendation === "no" || recommendation === "strong_no")) {
        flags.push(
            `RECOMMENDATION_MISMATCH: Score ${score} is high (≥80) but recommendation is "${recommendation}"`
        );
    }

    // "strong_yes" should require a high score
    if (recommendation === "strong_yes" && score < 75) {
        flags.push(
            `STRONG_YES_LOW_SCORE: Recommendation is "strong_yes" but score is only ${score} (<75)`
        );
    }

    return flags;
}

// CHECK 3: Suspicious Pattern Detection
// Flag patterns that suggest the AI was uncertain, confused, or produced
// a low-quality output rather than a genuine assessment.
function detectSuspiciousPatterns(scoringResult) {
    const flags = [];
    const { score, matchedSkills, missingSkills } = scoringResult;

    // Exactly 50 is a classic AI "I don't know, I'll split the difference" default
    if (score === 50) {
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

    return flags;
}

// ── Master cross-validation function ─────────────────────────────────────────
// Called by the validateResults node in screeningGraph.js.
// Takes the full AI scoring result + raw resume text.
// Returns { flags, passed, flagCount } — always returns, never throws.
function crossValidateScoringResult(scoringResult, resumeText) {
    try {
        const skillFlags = verifyMatchedSkillsInText(
            scoringResult.matchedSkills || [],
            resumeText
        );
        const consistencyFlags = verifyScoreConsistency(scoringResult);
        const suspiciousFlags = detectSuspiciousPatterns(scoringResult);

        const allFlags = [...skillFlags, ...consistencyFlags, ...suspiciousFlags];

        return {
            flags: allFlags,
            passed: allFlags.length === 0,
            flagCount: allFlags.length,
        };
    } catch (error) {
        // Should never throw but just in case
        return {
            flags: [`VALIDATION_ERROR: Validation itself threw — ${error.message}`],
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
};
