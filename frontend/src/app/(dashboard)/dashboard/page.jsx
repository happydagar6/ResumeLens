"use client";

import { useOverviewStats, useActivityFeed } from "@/hooks/use-stats";
import { useAuth } from "@/hooks/use-auth";

import { usePermissions } from "@/hooks/use-permissions";
import StatsCards from "@/components/dashboard/stats-cards";
import JobCard from "@/components/dashboard/job-card";
import { CardSkeleton } from "@/components/common/loading-state";
import { Button } from "@/components/ui/button";
import { Briefcase, Brain, BarChart3, Plus, Clock } from "lucide-react";
import Link from "next/link";

export default function DashboardHome() {
  const { user } = useAuth();
  const { canCreateJob } = usePermissions();
  const { stats, isLoading, isError } = useOverviewStats();
  const { activities, isLoading: activitiesLoading } = useActivityFeed();

  // Build the 4 stat cards from the real API response shape:
  // stats.jobs    → { total, open, closed, draft }
  // stats.resumes → { total, screened, screeningRate }
  // stats.screening → { totalScreenings, avgScore }
  const statCards = stats
    ? [
        {
          label: "Total Jobs",
          value: stats.jobs.total,
          icon: Briefcase,
        },
        {
          label: "Open Jobs",
          value: stats.jobs.open,
          icon: Briefcase,
        },
        {
          label: "Resumes Screened",
          value: stats.resumes.screened,
          icon: Brain,
        },
        {
          label: "Avg Match Score",
          value: stats.screening.avgScore > 0
            ? `${stats.screening.avgScore}/100`
            : "—",
          icon: BarChart3,
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back{user?.name ? `, ${user.name}` : ""}
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s an overview of your recruitment pipeline.
          </p>
        </div>
        {canCreateJob && (
          <Button asChild>
            <Link href="/jobs/new">
              <Plus className="mr-2 h-4 w-4" />
              New Job
            </Link>
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">Failed to load stats.</p>
      ) : (
        <StatsCards stats={statCards} />
      )}

      {/* Recent Jobs */}
      {!isLoading && stats?.recentJobs?.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Jobs</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/jobs">View all</Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stats.recentJobs.map((job) => (
              <JobCard key={job._id} job={job} />
            ))}
          </div>
        </div>
      )}

      {/* Activity Feed */}
      {!activitiesLoading && activities.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <div className="rounded-lg border divide-y">
            {activities.map((item, i) => (
              <div key={item._id ?? i} className="flex items-start gap-3 px-4 py-3">
                <Clock className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.message}</p>
                  {item.detail && (
                    <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(item.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}