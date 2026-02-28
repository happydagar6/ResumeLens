// src/services/emailDraftAgent.js
// LangChain-powered email draft generator.
// Generates a professional email based on the hiring decision and screening context.
// Returns { subject, body } as plain text strings.

const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { emailModel } = require("../config/langchain");
const { CustomError } = require("../utils/errors");

// ── Prompt ─────────────────────────────────────────────────────────────────────
// We use StringOutputParser here instead of JsonOutputParser because we want
// natural-sounding prose, not a JSON object.

const emailPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a professional recruitment coordinator writing on behalf of a hiring team.
Write emails that are:
- Warm but professional
- Specific to the candidate and role (use the context provided)
- Concise (3-5 short paragraphs)
- Never generic or templated-sounding
Format your response EXACTLY as:
SUBJECT: <email subject line>
---
<email body>`,
  ],
  [
    "human",
    `Write a {emailType} email for the following candidate.

Candidate Name: {candidateName}
Job Title: {jobTitle}
Company: {company}

AI Screening Summary:
- Overall Match Score: {score}/100
- Strengths: {strengths}
- Key Skills They Have: {matchedSkills}
- Skills They Are Missing: {missingSkills}

Email type instructions:
- "shortlisted": Inform them they've been shortlisted. Sound enthusiastic. Mention next steps are coming.
- "rejection": Decline respectfully. Acknowledge their effort. Keep it warm — no harsh language.
- "interview_invite": Invite them to interview. Mention 1-2 specific things about their background that impressed the team.
- "offer": Congratulate them warmly. Briefly mention what stood out. Ask them to confirm their interest.

Write the email now.`,
  ],
]);


// ── Chain ─────────────────────────────────────────────────────────────────────────────
const emailChain = emailPrompt.pipe(emailModel).pipe(new StringOutputParser());

// Main function
async function generateEmailDraft({ emailType, candidateName, jobTitle, company, score, strengths, matchedSkills, missingSkills }) {
    const validTypes = ["shortlisted", "rejection", "interview_invite", "offer"];
    if (!validTypes.includes(emailType)) {
        throw new CustomError(`Invalid emailType. Must be one of: ${validTypes.join(", ")}`, 400);
    }

    const raw = await emailChain.invoke({
        emailType,
        candidateName: candidateName || "the candidate",
        jobTitle: jobTitle || "the position",
        company: company || "our company",
        score: score ?? "N/A",
        strengths: Array.isArray(strengths) ? strengths.join("; ") : (strengths || "Not specified"),
        matchedSkills: Array.isArray(matchedSkills) ? matchedSkills.join(", ") : "Not specified",
        missingSkills: Array.isArray(missingSkills) ? missingSkills.join(", ") : "None specified",
    });

    // Parse the "SUBJECT: ... --- BODY ..." format
    const separatorIndex = raw.indexOf("---");
    if (separatorIndex === -1) {
        // Fallback: no seperator found - return entire response as body
        return { subject: `Re: Your application for ${jobTitle}`, body: raw.trim() };
    }

    const subjectLine = raw.substring(0, separatorIndex).replace("SUBJECT:", "").trim();
    const body = raw.substring(separatorIndex + 3).trim();

    return { subject: subjectLine, body };

}

module.exports = { generateEmailDraft };