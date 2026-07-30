// src/lib/generate-screening-pdf.js
//
// Generates a professional PDF screening report using jsPDF.
// Called from the screening detail page — all data is already in memory.
// No backend call needed.

import { jsPDF } from "jspdf";

// ── Color constants ───────────────────────────────────────────────────────────
const COLORS = {
  primary: [109, 40, 217],      // violet-600
  dark: [15, 23, 42],           // slate-900
  muted: [100, 116, 139],       // slate-500
  green: [22, 163, 74],         // green-600
  red: [220, 38, 38],           // red-600
  yellow: [202, 138, 4],        // yellow-600
  orange: [234, 88, 12],        // orange-600
  white: [255, 255, 255],
  lightGray: [241, 245, 249],   // slate-100
  border: [226, 232, 240],      // slate-200
};

const RECOMMENDATION_LABELS = {
  strong_yes: "Strong Yes",
  yes: "Yes",
  maybe: "Maybe",
  no: "No",
  strong_no: "Strong No",
};

const DECISION_LABELS = {
  shortlisted: "Shortlisted",
  rejected: "Rejected",
  on_hold: "On Hold",
  offered: "Offered",
};

// ── Score color helper (same logic as your ScoreGauge component) ──────────────
function getScoreColor(score) {
  if (score >= 80) return COLORS.green;
  if (score >= 60) return COLORS.yellow;
  if (score >= 40) return COLORS.orange;
  return COLORS.red;
}

function getRecommendationColor(rec) {
  if (rec === "strong_yes" || rec === "yes") return COLORS.green;
  if (rec === "maybe") return COLORS.yellow;
  return COLORS.red;
}

// ── Main export function ──────────────────────────────────────────────────────
// screening: the full populated screening object from useScreening()
// questions: the questions array from useQuestions() — can be null/empty
export function generateScreeningPDF(screening, questions = []) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();   // 210
  const pageHeight = doc.internal.pageSize.getHeight();  // 297
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;           // 180
  let y = margin; // vertical cursor — moves down as we draw

  // Helper: check if we need a new page
  const checkPageBreak = (needed) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Helper: draw a horizontal line
  const drawLine = () => {
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;
  };

  // ── 1. HEADER ─────────────────────────────────────────────────────────────

  // Purple brand bar at top
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...COLORS.white);
  doc.text("ResumeLens", margin, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("AI-Powered Screening Report", margin, 19);

  // Date on the right
  doc.setFontSize(9);
  doc.text(
    `Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
    pageWidth - margin,
    19,
    { align: "right" }
  );

  y = 36;

  // ── 2. CANDIDATE INFO ─────────────────────────────────────────────────────

  const candidate = screening.resumeId;
  const job = screening.jobId;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.dark);
  doc.text(candidate?.candidateName || "Unknown Candidate", margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.muted);
  if (candidate?.candidateEmail) {
    doc.text(candidate.candidateEmail, margin, y);
    y += 5;
  }

  doc.text(`Position: ${job?.title || "N/A"}  •  Company: ${job?.company || "N/A"}`, margin, y);
  y += 8;

  drawLine();

  // ── 3. SCORE & RECOMMENDATION ─────────────────────────────────────────────

  // Score circle
  const scoreColor = getScoreColor(screening.overallScore);
  const circleX = margin + 15;
  const circleY = y + 10;

  // Filled score circle
  doc.setFillColor(...scoreColor);
  doc.circle(circleX, circleY, 12, "F");

  // Score text inside circle
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...COLORS.white);
  doc.text(String(screening.overallScore), circleX, circleY + 2, { align: "center" });

  // "/100" label below circle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text("/100", circleX, circleY + 16, { align: "center" });

  // Score label to the right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.dark);
  doc.text("Match Score", circleX + 20, circleY - 3);

  // Recommendation next to score
  const recColor = getRecommendationColor(screening.recommendation);
  doc.setFontSize(10);
  doc.setTextColor(...recColor);
  doc.text(
    `AI Recommendation: ${RECOMMENDATION_LABELS[screening.recommendation] || screening.recommendation}`,
    circleX + 20,
    circleY + 4
  );

  y = circleY + 22;
  drawLine();

  // ── 4. SKILLS ─────────────────────────────────────────────────────────────

  checkPageBreak(30);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.dark);
  doc.text("Skills Analysis", margin, y);
  y += 7;

  // Matched skills
  if (screening.matchedSkills?.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.green);
    doc.text(`✓ Matched (${screening.matchedSkills.length})`, margin, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.dark);

    // Render skills as inline badges — wrap to multiple lines
    let x = margin;
    for (const skill of screening.matchedSkills) {
      const textWidth = doc.getTextWidth(skill) + 6;
      if (x + textWidth > pageWidth - margin) {
        x = margin;
        y += 6;
        checkPageBreak(10);
      }
      // Badge background
      doc.setFillColor(220, 252, 231); // green-100
      doc.roundedRect(x, y - 3.5, textWidth, 5, 1, 1, "F");
      doc.setFontSize(8);
      doc.setTextColor(22, 101, 52); // green-800
      doc.text(skill, x + 3, y);
      x += textWidth + 2;
    }
    y += 8;
  }

  // Missing skills
  if (screening.missingSkills?.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.red);
    doc.text(`✗ Missing (${screening.missingSkills.length})`, margin, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    let x = margin;
    for (const skill of screening.missingSkills) {
      const textWidth = doc.getTextWidth(skill) + 6;
      if (x + textWidth > pageWidth - margin) {
        x = margin;
        y += 6;
        checkPageBreak(10);
      }
      doc.setFillColor(254, 226, 226); // red-100
      doc.roundedRect(x, y - 3.5, textWidth, 5, 1, 1, "F");
      doc.setFontSize(8);
      doc.setTextColor(153, 27, 27); // red-800
      doc.text(skill, x + 3, y);
      x += textWidth + 2;
    }
    y += 8;
  }

  drawLine();

  // ── 5. STRENGTHS & WEAKNESSES ─────────────────────────────────────────────

  if (screening.strengths?.length > 0) {
    checkPageBreak(25);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.green);
    doc.text("Strengths", margin, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.dark);

    if (Array.isArray(screening.strengths)) {
      // New format: render as bullet list
      screening.strengths.forEach((s) => {
        checkPageBreak(8);
        doc.text("\u2022", margin + 2, y);
        const lines = doc.splitTextToSize(s, contentWidth - 8);
        doc.text(lines, margin + 8, y);
        y += lines.length * 4 + 2;
      });
    } else {
      // Old format: render as paragraph
      const strengthLines = doc.splitTextToSize(screening.strengths, contentWidth);
      checkPageBreak(strengthLines.length * 4 + 4);
      doc.text(strengthLines, margin, y);
      y += strengthLines.length * 4 + 4;
    }
    y += 2;
  }

  if (screening.weaknesses?.length > 0) {
    checkPageBreak(25);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.red);
    doc.text("Weaknesses", margin, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.dark);

    if (Array.isArray(screening.weaknesses)) {
      // New format: render as bullet list
      screening.weaknesses.forEach((w) => {
        checkPageBreak(8);
        doc.text("\u2022", margin + 2, y);
        const lines = doc.splitTextToSize(w, contentWidth - 8);
        doc.text(lines, margin + 8, y);
        y += lines.length * 4 + 2;
      });
    } else {
      // Old format: render as paragraph
      const weaknessLines = doc.splitTextToSize(screening.weaknesses, contentWidth);
      checkPageBreak(weaknessLines.length * 4 + 4);
      doc.text(weaknessLines, margin, y);
      y += weaknessLines.length * 4 + 4;
    }
    y += 2;
  }

  drawLine();

  // ── 6. HIRING MANAGER DECISION ────────────────────────────────────────────

  if (screening.hiringManagerDecision) {
    checkPageBreak(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.dark);
    doc.text("Hiring Manager Decision", margin, y);
    y += 6;

    // Decision badge
    const decisionLabel = DECISION_LABELS[screening.hiringManagerDecision] || screening.hiringManagerDecision;
    const isPositive = ["shortlisted", "offered"].includes(screening.hiringManagerDecision);
    doc.setFillColor(...(isPositive ? [220, 252, 231] : [254, 226, 226]));
    const badgeWidth = doc.getTextWidth(decisionLabel) + 8;
    doc.roundedRect(margin, y - 3.5, badgeWidth, 6, 1.5, 1.5, "F");
    doc.setFontSize(9);
    doc.setTextColor(...(isPositive ? COLORS.green : COLORS.red));
    doc.text(decisionLabel, margin + 4, y);
    y += 4;

    // Decided by
    if (screening.decidedBy) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.muted);
      doc.text(
        `by ${screening.decidedBy.name || screening.decidedBy.email}${screening.decidedAt ? ` on ${new Date(screening.decidedAt).toLocaleDateString()}` : ""}`,
        margin,
        y + 2
      );
      y += 6;
    }

    // Notes
    if (screening.notes) {
      y += 2;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.muted);
      const noteLines = doc.splitTextToSize(`Notes: ${screening.notes}`, contentWidth);
      doc.text(noteLines, margin, y);
      y += noteLines.length * 3.5 + 2;
    }

    y += 4;
    drawLine();
  }

  // ── 7. INTERVIEW QUESTIONS ────────────────────────────────────────────────

  if (questions && questions.length > 0) {
    checkPageBreak(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.dark);
    doc.text(`Interview Questions (${questions.length})`, margin, y);
    y += 7;

    questions.forEach((q, i) => {
      checkPageBreak(15);

      // Question number + text
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.primary);
      doc.text(`Q${i + 1}.`, margin, y);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.dark);
      const qLines = doc.splitTextToSize(q.question, contentWidth - 10);
      doc.text(qLines, margin + 10, y);
      y += qLines.length * 4;

      // Category + difficulty tags
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.muted);
      doc.text(`${q.category || "general"}  •  ${q.difficulty || "medium"}`, margin + 10, y);
      y += 6;
    });
  }

  // ── 8. FOOTER ─────────────────────────────────────────────────────────────

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text(
      `ResumeLens Screening Report  •  Page ${p} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    );
  }

  // ── SAVE ──────────────────────────────────────────────────────────────────
  const safeName = (candidate?.candidateName || "candidate").replace(/\s+/g, "-").toLowerCase();
  doc.save(`screening-report-${safeName}.pdf`);
}