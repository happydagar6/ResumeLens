"use client";

import { useState } from "react";
import { useCandidates } from "@/hooks/use-resume";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, SlidersHorizontal } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ScoreGauge from "@/components/dashboard/score-gauge";
import { 
  Users, 
  Sparkles, 
  CheckCircle2, 
  Download, 
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  GraduationCap,
  ArrowUpRight,
  Briefcase,
  Mail,
  UserX
} from "lucide-react";
import Link from "next/link";


// ── Badges Styling Configurations ───────────────────────────────────────────
const STAGE_CONFIG = {
  applied: { label: "Applied", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  in_review: { label: "In Review", className: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" },
  shortlisted: { label: "Shortlisted", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  offered: { label: "Offered", className: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20" },
  rejected: { label: "Rejected", className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
};

const REC_CONFIG = {
  strong_yes: { label: "Strong Yes", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  yes: { label: "Yes", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  maybe: { label: "Maybe", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  no: { label: "No", className: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" },
  strong_no: { label: "Strong No", className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
};

function formatDate(dateString) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function escapeCSV(field) {
  if (field === null || field === undefined) return '""';
  const str = String(field);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}


export default function CandidatesDirectoryPage() {
  // ── 1. Filter & Pagination State ──────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState("all");
  const [selectedStage, setSelectedStage] = useState("all");
  const [minScore, setMinScore] = useState("0");
  const [page, setPage] = useState(1);

  // Debounce search input so the backend isn't queried on every keystroke
  const debouncedSearch = useDebounce(search, 350);

  // ── 2. Data Fetching via React Query ─────────────────────────────────────
  const { candidates, pagination, jobs, isLoading, isFetching, refetch } = useCandidates({
    search: debouncedSearch,
    jobId: selectedJob,
    stage: selectedStage,
    minScore: Number(minScore),
    page,
    limit: 10,
  });

  // ── 3. Live Metrics Calculations ─────────────────────────────────────────
  // Calculate quick stats from the current candidate view
  const screenedCount = candidates.filter((c) => c.screening !== null).length;
  const shortlistedCount = candidates.filter((c) => c.currentStage === "shortlisted").length;


  const hasActiveFilters = Boolean(
    search || selectedJob !== "all" || selectedStage !== "all" || minScore !== "0"
  );


  function handleFilterChange(setter) {
    return (value) => {
        setter(value);
        setPage(1);
    }
  }

  function handleResetFilters() {
    setSearch("");
    setSelectedJob("all");
    setSelectedStage("all");
    setMinScore("0");
    setPage(1);
  }

  // Pagination item counters
  const startItem = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endItem = Math.min(pagination.page * pagination.limit, pagination.total);

  // 1-Click CSV Export for the current talent pool view
  function handleExportCSV() {
    if (candidates.length === 0) return;

    const headers = [
      "Candidate Name",
      "Candidate Email",
      "Applied Job",
      "Company",
      "Department",
      "Hiring Stage",
      "AI Overall Score",
      "AI Recommendation",
      "Past Applicant",
      "Application Date",
    ];

    const rows = candidates.map((c) => [
      escapeCSV(c.candidateName || "Unknown"),
      escapeCSV(c.candidateEmail || ""),
      escapeCSV(c.job?.title || "N/A"),
      escapeCSV(c.job?.company || "N/A"),
      escapeCSV(c.job?.department || "N/A"),
      escapeCSV((c.currentStage || "applied").toUpperCase()),
      escapeCSV(c.screening?.overallScore ?? "Pending"),
      escapeCSV(c.screening?.recommendation ? c.screening.recommendation.replace("_", " ").toUpperCase() : "PENDING"),
      escapeCSV(c.isPastApplicant ? "YES" : "NO"),
      escapeCSV(c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ""),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().split("T")[0];

    link.setAttribute("href", url);
    link.setAttribute("download", `talent_pool_candidates_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }


  return (
    <div className="space-y-6">
      {/* ── BLOCK 1: Header & Live Metrics ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Candidates Directory</h1>
            <Badge variant="outline" className="text-xs font-normal">
              Talent Pool
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Search, filter, and review candidates across all your accessible job postings.
          </p>
        </div>

        {/* Header Action: Refresh & Export CSV */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs"
            disabled={candidates.length === 0}
            onClick={handleExportCSV}
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border/60 bg-linear-to-br from-card to-muted/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Candidates</p>
              <p className="text-2xl font-bold mt-1">{pagination.total}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-linear-to-br from-card to-muted/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Screened by AI</p>
              <p className="text-2xl font-bold mt-1 text-violet-600 dark:text-violet-400">
                {screenedCount}
                <span className="text-xs font-normal text-muted-foreground ml-1.5">
                  ({candidates.length > 0 ? Math.round((screenedCount / candidates.length) * 100) : 0}%)
                </span>
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-linear-to-br from-card to-muted/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Shortlisted</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                {shortlistedCount}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── BLOCK 2: Multi-Filter Control Bar ──────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-xs">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {/* 1. Search Input (Debounced) */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search candidate name, email, or skills..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-10 bg-background/50"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* 2. Job Filter Dropdown */}
          <div className="w-full md:w-56">
            <Select
              value={selectedJob}
              onValueChange={handleFilterChange(setSelectedJob)}
            >
              <SelectTrigger className="h-10 bg-background/50">
                <SelectValue placeholder="All Jobs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs ({jobs.length})</SelectItem>
                {jobs.map((job) => (
                  <SelectItem key={job._id} value={job._id}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. Hiring Stage Dropdown */}
          <div className="w-full md:w-44">
            <Select
              value={selectedStage}
              onValueChange={handleFilterChange(setSelectedStage)}
            >
              <SelectTrigger className="h-10 bg-background/50">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="applied">Applied (Unscreened)</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="shortlisted">Shortlisted</SelectItem>
                <SelectItem value="offered">Offered</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 4. Min AI Match Score Dropdown */}
          <div className="w-full md:w-40">
            <Select
              value={minScore}
              onValueChange={handleFilterChange(setMinScore)}
            >
              <SelectTrigger className="h-10 bg-background/50">
                <SelectValue placeholder="Min Score" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">All Scores</SelectItem>
                <SelectItem value="80">Score ≥ 80%</SelectItem>
                <SelectItem value="70">Score ≥ 70%</SelectItem>
                <SelectItem value="60">Score ≥ 60%</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 5. Reset Filters Button */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-10 gap-1.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
            >
              <X className="h-3.5 w-3.5" />
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* ── BLOCK 3: Master Candidates Table & States ──────────────────────── */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
        {/* Loading Skeleton State */}
        {isLoading && candidates.length === 0 ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 rounded bg-muted" />
                  <div className="h-3 w-32 rounded bg-muted/60" />
                </div>
                <div className="h-6 w-24 rounded bg-muted" />
                <div className="h-6 w-20 rounded bg-muted" />
                <div className="h-8 w-24 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : candidates.length === 0 ? (
          /* Empty State */
          <div className="py-16 px-4 text-center">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-muted/40 flex items-center justify-center text-muted-foreground mb-3">
              <UserX className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold">No candidates found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              No candidates match your current search or filters. Try adjusting your search term or clearing filters.
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="mt-4 h-8 text-xs gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Clear All Filters
              </Button>
            )}
          </div>
        ) : (
          /* Master Candidates Table */
          <>
            <div className="relative overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-[300px]">Candidate</TableHead>
                  <TableHead>Applied For</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>AI Match & Rec</TableHead>
                  <TableHead>Applied Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((c) => {
                  const stageInfo = STAGE_CONFIG[c.currentStage] || {
                    label: c.currentStage || "Applied",
                    className: "bg-muted text-muted-foreground border-border",
                  };
                  const recInfo = c.screening?.recommendation
                    ? REC_CONFIG[c.screening.recommendation]
                    : null;

                  const initials = c.candidateName
                    ? c.candidateName
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    : "C";

                  return (
                    <TableRow key={c._id} className="hover:bg-muted/20 transition-colors">
                      {/* 1. Candidate Info Column */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-linear-to-br from-primary/15 to-primary/30 text-primary font-bold text-xs flex items-center justify-center shrink-0 border border-primary/20">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-foreground text-sm truncate">
                                {c.candidateName || "Unnamed Candidate"}
                              </span>
                              {c.isPastApplicant && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-normal px-1.5 py-0 h-4 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                >
                                  Past Applicant
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground truncate mt-0.5">
                              <Mail className="h-3 w-3 shrink-0" />
                              <span className="truncate">{c.candidateEmail || "No email"}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* 2. Job Role Column */}
                      <TableCell>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">
                            {c.job?.title || "Unknown Job"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {c.job?.company || "Company"} {c.job?.department ? `· ${c.job.department}` : ""}
                          </p>
                        </div>
                      </TableCell>

                      {/* 3. Hiring Stage Column */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs font-medium capitalize ${stageInfo.className}`}
                        >
                          {stageInfo.label}
                        </Badge>
                      </TableCell>

                      {/* 4. AI Match Score & Recommendation Column */}
                      <TableCell>
                        {c.screening ? (
                          <div className="flex items-center gap-2.5">
                            <div className="w-16">
                              <ScoreGauge score={c.screening.overallScore} />
                            </div>
                            {recInfo && (
                              <Badge
                                variant="outline"
                                className={`text-[11px] font-medium ${recInfo.className}`}
                              >
                                {recInfo.label}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                            Pending Screening
                          </Badge>
                        )}
                      </TableCell>

                      {/* 5. Applied Date Column */}
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(c.createdAt)}
                      </TableCell>

                      {/* 6. Action Button Column */}
                      <TableCell className="text-right">
                        {c.screening ? (
                          <Button variant="ghost" size="sm" asChild className="h-8 gap-1 text-xs text-primary hover:text-primary">
                            <Link href={`/screening/${c.screening._id}`}>
                              View Report
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" asChild className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground">
                            <Link href={`/jobs/${c.job?._id}/screening`}>
                              Pipeline
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* ── BLOCK 5: Pagination Footer Bar ─────────────────────────────── */}
          {pagination.total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/60 px-4 py-3 bg-muted/15 text-xs text-muted-foreground">
              <div>
                Showing <span className="font-semibold text-foreground">{startItem}</span> to{" "}
                <span className="font-semibold text-foreground">{endItem}</span> of{" "}
                <span className="font-semibold text-foreground">{pagination.total}</span> candidates
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1 || isFetching}
                  className="h-8 gap-1 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </Button>

                <span className="px-2 font-medium text-foreground">
                  Page {pagination.page} of {pagination.pages || 1}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={pagination.page >= pagination.pages || isFetching}
                  className="h-8 gap-1 text-xs"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  </div>
  );
}