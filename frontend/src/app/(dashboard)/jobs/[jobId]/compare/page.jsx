"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useJob } from "@/hooks/use-jobs";
import { useScreeningsByJob, useMakeDecision } from "@/hooks/use-screening";
import { usePermissions } from "@/hooks/use-permissions";
import { LoadingSpinner } from "@/components/common/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import ScoreGauge from "@/components/dashboard/score-gauge";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

// ── Constants ─────────────────────────────────────────────────────────────────
const RECOMMENDATION_ORDER = {
  strong_yes: 1,
  yes: 2,
  maybe: 3,
  no: 4,
  strong_no: 5,
};

const RECOMMENDATION_LABELS = {
  strong_yes: "Strong Yes",
  yes: "Yes",
  maybe: "Maybe",
  no: "No",
  strong_no: "Strong No",
};

const RECOMMENDATION_COLORS = {
  strong_yes: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  yes: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  maybe: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
  no: "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
  strong_no: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
};

const DECISION_OPTIONS = [
  { value: "shortlisted", label: "Shortlist" },
  { value: "offered", label: "Offer" },
  { value: "on_hold", label: "On Hold" },
  { value: "rejected", label: "Reject" },
];

const DECISION_COLORS = {
  shortlisted: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  offered: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  on_hold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

// ── Radar chart helpers ───────────────────────────────────────────────────────
const CHART_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6",
  "#ec4899", "#14b8a6", "#f97316",
];

function buildRadarData(screenings) {
  // Collect all unique skills across all candidates
  const allSkills = new Set();
  screenings.forEach((s) => {
    (s.matchedSkills ?? []).forEach((sk) => allSkills.add(sk));
    (s.missingSkills ?? []).forEach((sk) => allSkills.add(sk));
  });

  const skillList = [...allSkills].slice(0, 8); // cap at 8 axes for readability

  return skillList.map((skill) => {
    const entry = { skill };
    screenings.forEach((s, i) => {
      const name = s.resumeId?.candidateName?.split(" ")[0] ?? `C${i + 1}`;
      entry[name] = (s.matchedSkills ?? []).includes(skill) ? 100 : 0;
    });
    return entry;
  });
}

// ── Sort helpers ──────────────────────────────────────────────────────────────
function getSortValue(screening, key) {
  if (key === "score") return screening.overallScore ?? 0;
  if (key === "recommendation")
    return RECOMMENDATION_ORDER[screening.recommendation] ?? 99;
  if (key === "decision")
    return screening.hiringManagerDecision
      ? DECISION_OPTIONS.findIndex((d) => d.value === screening.hiringManagerDecision)
      : 999;
  return 0;
}

function sortScreenings(screenings, key, direction) {
  return [...screenings].sort((a, b) => {
    const av = getSortValue(a, key);
    const bv = getSortValue(b, key);
    return direction === "asc" ? av - bv : bv - av;
  });
}

// ── Sort header button ────────────────────────────────────────────────────────
function SortButton({ label, sortKey, currentKey, direction, onSort }) {
  const isActive = currentKey === sortKey;
  return (
    <button
      onClick={() => onSort(sortKey)}
      className="flex items-center gap-1 font-semibold text-left hover:text-foreground transition-colors"
    >
      {label}
      {isActive ? (
        direction === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function CompareCandidatesPage() {
  const { jobId } = useParams();

  const { job, isLoading: jobLoading } = useJob(jobId);
  const { screenings, isLoading: screeningsLoading } = useScreeningsByJob(jobId);
  const { canMakeDecision } = usePermissions();
  const decisionMutation = useMakeDecision();

  // Sort state
  const [sortKey, setSortKey] = useState("score");
  const [sortDir, setSortDir] = useState("desc");

  const isLoading = jobLoading || screeningsLoading;
  if (isLoading) return <LoadingSpinner />;

  const sorted = sortScreenings(screenings, sortKey, sortDir);

  function handleSort(key) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "score" ? "desc" : "asc");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/jobs/${jobId}/screening`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compare Candidates</h1>
          <p className="text-muted-foreground">
            {job?.title} at {job?.company} · {screenings.length} candidate(s)
          </p>
        </div>
      </div>

      {screenings.length === 0 ? (
        <p className="text-sm text-muted-foreground">No screened candidates yet.</p>
      ) : (
        <>
          {/* Radar chart — shown when 2–8 candidates are present and skills exist */}
          {sorted.length >= 2 && sorted.length <= 8 && buildRadarData(sorted).length > 0 && (
            <div className="rounded-lg border p-4 space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Skills Radar
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={buildRadarData(sorted)}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  {sorted.map((s, i) => {
                    const name = s.resumeId?.candidateName?.split(" ")[0] ?? `C${i + 1}`;
                    return (
                      <Radar
                        key={s._id}
                        name={name}
                        dataKey={name}
                        stroke={CHART_COLORS[i % CHART_COLORS.length]}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                        fillOpacity={0.15}
                      />
                    );
                  })}
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>
                  <SortButton
                    label="Score"
                    sortKey="score"
                    currentKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead className="hidden md:table-cell">Matched Skills</TableHead>
                <TableHead className="hidden md:table-cell">Missing Skills</TableHead>
                <TableHead>
                  <SortButton
                    label="AI Rec."
                    sortKey="recommendation"
                    currentKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>
                  <SortButton
                    label="Decision"
                    sortKey="decision"
                    currentKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                </TableHead>
                {canMakeDecision && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((screening) => {
                const candidate = screening.resumeId;
                return (
                  <TableRow key={screening._id}>
                    {/* Candidate name — links to the detail page */}
                    <TableCell>
                      <Link
                        href={`/screening/${screening._id}`}
                        className="font-medium hover:underline text-primary"
                      >
                        {candidate?.candidateName || "Unknown"}
                      </Link>
                      {candidate?.candidateEmail && (
                        <p className="text-xs text-muted-foreground">
                          {candidate.candidateEmail}
                        </p>
                      )}
                    </TableCell>

                    {/* Score gauge (compact) */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold tabular-nums">
                          {screening.overallScore ?? "—"}
                        </span>
                        <span className="text-xs text-muted-foreground">/100</span>
                      </div>
                    </TableCell>

                    {/* Matched Skills */}
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {(screening.matchedSkills ?? []).slice(0, 4).map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs">
                            {s}
                          </Badge>
                        ))}
                        {(screening.matchedSkills?.length ?? 0) > 4 && (
                          <Badge variant="secondary" className="text-xs">
                            +{screening.matchedSkills.length - 4}
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Missing Skills */}
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {(screening.missingSkills ?? []).slice(0, 3).map((s) => (
                          <Badge
                            key={s}
                            variant="outline"
                            className="text-xs text-muted-foreground"
                          >
                            {s}
                          </Badge>
                        ))}
                        {(screening.missingSkills?.length ?? 0) > 3 && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            +{screening.missingSkills.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* AI Recommendation */}
                    <TableCell>
                      {screening.recommendation ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            RECOMMENDATION_COLORS[screening.recommendation] ?? ""
                          }`}
                        >
                          {RECOMMENDATION_LABELS[screening.recommendation] ??
                            screening.recommendation}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* HM Decision badge */}
                    <TableCell>
                      {screening.hiringManagerDecision ? (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            DECISION_COLORS[screening.hiringManagerDecision] ?? ""
                          }`}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          {screening.hiringManagerDecision.replace("_", " ")}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Pending</span>
                      )}
                    </TableCell>

                    {/* Inline decide dropdown (HM + admin only) */}
                    {canMakeDecision && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={decisionMutation.isPending}
                            >
                              Decide
                              <ChevronDown className="ml-1 h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {DECISION_OPTIONS.map((opt) => (
                              <DropdownMenuItem
                                key={opt.value}
                                onClick={() =>
                                  decisionMutation.mutate({
                                    screeningId: screening._id,
                                    decision: opt.value,
                                    jobId,
                                  })
                                }
                              >
                                {opt.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        </>
      )}
    </div>
  );
}
