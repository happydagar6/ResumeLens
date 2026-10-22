"use client";

import Link from "next/link";
import { useOverviewStats, useActivityFeed, useClearActivity } from "@/hooks/use-stats";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import StatsCards from "@/components/dashboard/stats-cards";
import JobCard from "@/components/dashboard/job-card";
import { CardSkeleton } from "@/components/common/loading-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  Brain,
  BarChart3,
  Plus,
  Zap,
  Users,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  Award,
  Layers,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";

export default function DashboardHome() {
  const { user } = useAuth();
  const { canCreateJob } = usePermissions();
  const { stats, isLoading, isError } = useOverviewStats();
  const { activities, isLoading: activitiesLoading } = useActivityFeed();
  const clearActivity = useClearActivity();

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Executive Stat Cards (Top KPI Row)
  // Maps API payload into 4 primary KPI cards with live icons & numbers
  // ───────────────────────────────────────────────────────────────────────────
  const statCards = stats
    ? [
        {
          label: "Total Jobs",
          value: stats.jobs.total,
          icon: Briefcase,
        },
        {
          label: "Open Positions",
          value: stats.jobs.open,
          icon: Layers,
        },
        {
          label: "Resumes Screened",
          value: stats.resumes.screened,
          icon: Brain,
        },
        {
          label: "Avg Match Score",
          value: stats.screening.avgScore > 0 ? `${stats.screening.avgScore}/100` : "—",
          icon: BarChart3,
        },
      ]
    : [];

  // ───────────────────────────────────────────────────────────────────────────
  // 2. AI Recommendation Tier Breakdown Calculation
  // Calculates count and percentage for Strong Yes, Yes, Maybe, and No
  // ───────────────────────────────────────────────────────────────────────────
  const recs = stats?.screening?.byRecommendation || {};
  const strongYesCount = recs["strong_yes"] || 0;
  const yesCount = recs["yes"] || 0;
  const maybeCount = recs["maybe"] || 0;
  const noCount = recs["no"] || 0;
  const totalScreened = stats?.resumes?.screened || 0;

  const getPercentage = (count) => {
    if (!totalScreened) return 0;
    return Math.round((count / totalScreened) * 100);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Hiring Pipeline Funnel Stages
  // Computes application flow: Total Uploaded ➔ Parsed ➔ AI Screened
  // ───────────────────────────────────────────────────────────────────────────
  const totalUploaded = stats?.resumes?.total || 0;
  const totalPending = stats?.resumes?.pending || 0;
  const totalErrors = stats?.resumes?.errors || 0;
  const screeningRate = stats?.resumes?.screeningRate || 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* ── SECTION 1: Executive Welcome & Action Header ───────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-linear-to-r from-primary/10 via-violet-500/5 to-background border border-border/60 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back{user?.name ? (
                <>, <span className="gradient-brand">{user.name}</span></>
              ) : ""}
            </h1>
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <span>Autonomous AI recruitment pipeline active for</span>
            {user?.company ? (
              <span className="font-semibold text-foreground underline underline-offset-4 decoration-primary/40">
                {user.company}
              </span>
            ) : (
              <span className="font-semibold text-foreground">your organization</span>
            )}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button variant="outline" asChild className="h-9 text-xs border-border/80 hover:bg-muted/60 shadow-xs">
            <Link href="/candidates">
              <Users className="mr-1.5 h-3.5 w-3.5 text-primary" />
              Talent Pool
            </Link>
          </Button>

          {canCreateJob && (
            <Button asChild className="h-9 text-xs bg-linear-to-r from-primary to-violet-600 text-white shadow-md shadow-primary/25 hover:opacity-90 border-0">
              <Link href="/jobs/new">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Post New Job
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* ── SECTION 2: Top KPI Metric Cards ─────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : isError ? (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          Failed to load overview analytics.
        </div>
      ) : (
        <StatsCards stats={statCards} />
      )}

      {/* ── SECTION 3: Visual Analytics (Funnel + AI Recommendation Quality) ── */}
      {!isLoading && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card A: Pipeline Conversion & Ingestion Funnel */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Pipeline Flow & Efficiency</h2>
                  <p className="text-xs text-muted-foreground">Candidate progression from upload to AI decision</p>
                </div>
              </div>
              <Badge variant="outline" className="font-semibold text-xs border-primary/30 text-primary bg-primary/5">
                {screeningRate}% Screened
              </Badge>
            </div>

            {/* Visual Funnel Progression Bars */}
            <div className="space-y-4 pt-1">
              {/* Stage 1: Applications Received */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    Total Applicants Ingested
                  </span>
                  <span className="font-semibold tabular-nums">{totalUploaded} candidates</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: "100%" }} />
                </div>
              </div>

              {/* Stage 2: AI Screened */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-violet-500" />
                    Evaluated by LangGraph AI
                  </span>
                  <span className="font-semibold tabular-nums">
                    {stats.resumes.screened} ({screeningRate}%)
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-violet-500 to-primary rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, screeningRate)}%` }}
                  />
                </div>
              </div>

              {/* Stage 3: Pending in Queue */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Pending in BullMQ Queue
                  </span>
                  <span className="font-semibold tabular-nums">{totalPending} candidates</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${totalUploaded > 0 ? Math.round((totalPending / totalUploaded) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Metrics Footer */}
            <div className="pt-3 border-t border-border/50 grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-muted/40">
                <p className="text-[11px] text-muted-foreground uppercase font-semibold">Active Jobs</p>
                <p className="text-lg font-bold text-foreground mt-0.5">{stats.jobs.open}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/40">
                <p className="text-[11px] text-muted-foreground uppercase font-semibold">Success Rate</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {totalUploaded > 0 ? `${Math.round(((totalUploaded - totalErrors) / totalUploaded) * 100)}%` : "100%"}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/40">
                <p className="text-[11px] text-muted-foreground uppercase font-semibold">Drafts</p>
                <p className="text-lg font-bold text-muted-foreground mt-0.5">{stats.jobs.draft}</p>
              </div>
            </div>
          </div>

          {/* Card B: AI Candidate Match Distribution */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Award className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">AI Match Score Quality</h2>
                  <p className="text-xs text-muted-foreground">Distribution of applicant qualifications</p>
                </div>
              </div>
              {stats.screening.highestScore > 0 && (
                <Badge variant="outline" className="font-semibold text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                  Peak: {stats.screening.highestScore}/100
                </Badge>
              )}
            </div>

            {/* Tier Progress Rows */}
            <div className="space-y-3 pt-1">
              {/* Strong Yes (90-100) */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Strong Yes (Top Tier)
                  </span>
                  <span className="font-bold tabular-nums">
                    {strongYesCount} <span className="font-normal text-muted-foreground">({getPercentage(strongYesCount)}%)</span>
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${getPercentage(strongYesCount)}%` }} />
                </div>
              </div>

              {/* Yes (75-89) */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Yes (Good Match)
                  </span>
                  <span className="font-bold tabular-nums">
                    {yesCount} <span className="font-normal text-muted-foreground">({getPercentage(yesCount)}%)</span>
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full transition-all duration-500" style={{ width: `${getPercentage(yesCount)}%` }} />
                </div>
              </div>

              {/* Maybe (60-74) */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <span className="h-3.5 w-3.5 rounded-full border border-amber-500 flex items-center justify-center text-[9px] font-bold">?</span>
                    Maybe (Partial Match)
                  </span>
                  <span className="font-bold tabular-nums">
                    {maybeCount} <span className="font-normal text-muted-foreground">({getPercentage(maybeCount)}%)</span>
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${getPercentage(maybeCount)}%` }} />
                </div>
              </div>

              {/* No (<60) */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <span className="h-3.5 w-3.5 rounded-full border border-rose-500 flex items-center justify-center text-[9px] font-bold">✕</span>
                    No (Not Recommended)
                  </span>
                  <span className="font-bold tabular-nums">
                    {noCount} <span className="font-normal text-muted-foreground">({getPercentage(noCount)}%)</span>
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full transition-all duration-500" style={{ width: `${getPercentage(noCount)}%` }} />
                </div>
              </div>
            </div>

            {/* Summary Banner */}
            <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Total Evaluated:</span>
              <span className="font-semibold text-foreground">{stats.screening.totalScreenings} candidate profiles</span>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 4: Recent Jobs Requisitions ─────────────────────────────── */}
      {!isLoading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold">Active Job Requisitions</h2>
            </div>
            {stats?.recentJobs?.length > 0 && (
              <Button variant="ghost" size="sm" asChild className="text-xs text-primary hover:text-primary">
                <Link href="/jobs" className="flex items-center gap-1">
                  View all ({stats.jobs.total})
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </div>

          {stats?.recentJobs?.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stats.recentJobs.map((job) => (
                <JobCard key={job._id} job={job} />
              ))}
            </div>
          ) : (
            /* Empty state when no jobs exist yet */
            <div className="p-8 rounded-2xl border border-dashed border-border text-center space-y-3 bg-muted/10">
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Briefcase className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold">No active job requisitions</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Create your first job posting to start receiving applicants and triggering AI candidate screening.
              </p>
              {canCreateJob && (
                <Button asChild size="sm" className="bg-primary text-white text-xs">
                  <Link href="/jobs/new">
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Create First Job
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── SECTION 5: Live Activity Stream & Audit Feed ────────────────────── */}
      {!activitiesLoading && activities.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold">Live Pipeline Activity</h2>
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-medium">
                Real-time
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 text-muted-foreground hover:text-foreground"
              onClick={() => clearActivity.mutate()}
              disabled={clearActivity.isPending}
            >
              Clear Log
            </Button>
          </div>

          <div className="rounded-2xl border border-border/60 overflow-hidden divide-y divide-border/50 bg-card shadow-xs">
            {activities.map((item, i) => {
              const isScreening = item.type === "screening";
              const isJob = item.type === "job";
              return (
                <div
                  key={item._id ?? i}
                  className="flex items-start gap-3.5 px-4 py-3 hover:bg-muted/30 transition-colors text-xs"
                >
                  <span
                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                      isScreening
                        ? "bg-violet-500 shadow-xs shadow-violet-500/50"
                        : isJob
                        ? "bg-primary shadow-xs shadow-primary/50"
                        : "bg-emerald-500 shadow-xs shadow-emerald-500/50"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{item.message}</p>
                    {item.detail && (
                      <p className="text-muted-foreground truncate text-[11px] mt-0.5">{item.detail}</p>
                    )}
                  </div>
                  <span className="text-muted-foreground whitespace-nowrap tabular-nums text-[11px]">
                    {new Date(item.timestamp).toLocaleDateString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}