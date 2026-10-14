/**
 * Utility to export candidate screening data to a CSV spreadsheet
 */
export function exportCandidatesToCSV(job, screenings = [], resumes = []) {
  if (!job) return;

  // 1. Define CSV Column Headers
  const headers = [
    "Candidate Name",
    "Candidate Email",
    "Overall Score",
    "AI Recommendation",
    "Current Stage",
    "Matched Skills",
    "Missing Skills",
    "Application Date",
  ];

  // 2. Build rows for screened candidates
  const screenedRows = screenings.map((s) => {
    const candidate = s.resumeId || {};
    const name = candidate.candidateName || "Unknown Candidate";
    const email = candidate.candidateEmail || "";
    const score = s.overallScore ?? "N/A";
    const rec = s.recommendation
      ? s.recommendation.replace("_", " ").toUpperCase()
      : "PENDING";
    const decision = s.hiringManagerDecision
      ? s.hiringManagerDecision.toUpperCase()
      : "IN REVIEW";
    const matched = (s.matchedSkills || []).join("; ");
    const missing = (s.missingSkills || []).join("; ");
    const date = s.createdAt
      ? new Date(s.createdAt).toLocaleDateString()
      : "";

    return [
      escapeCSV(name),
      escapeCSV(email),
      escapeCSV(score),
      escapeCSV(rec),
      escapeCSV(decision),
      escapeCSV(matched),
      escapeCSV(missing),
      escapeCSV(date),
    ].join(",");
  });

  // 3. Build rows for unscreened resumes (in "Applied" stage)
  const screenedIds = new Set(
    screenings.map((s) => s.resumeId?._id || s.resumeId)
  );
  const unscreenedResumes = resumes.filter((r) => !screenedIds.has(r._id));

  const unscreenedRows = unscreenedResumes.map((r) => {
    return [
      escapeCSV(r.candidateName || "Unknown"),
      escapeCSV(r.candidateEmail || ""),
      "Pending",
      "PENDING",
      "APPLIED",
      "",
      "",
      r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "",
    ].join(",");
  });

  // 4. Combine headers and all candidate rows
  const allRows = [headers.join(","), ...screenedRows, ...unscreenedRows];
  const csvContent = allRows.join("\n");

  // 5. Trigger browser download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  const sanitizedJobTitle = (job.title || "job")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_");
  const dateStr = new Date().toISOString().split("T")[0];

  link.setAttribute("href", url);
  link.setAttribute("download", `${sanitizedJobTitle}_candidates_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Escapes fields containing commas, quotes, or newlines according to CSV standard
 */
function escapeCSV(field) {
  if (field === null || field === undefined) return '""';
  const str = String(field);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}
