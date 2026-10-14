"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useJob } from "@/hooks/use-jobs";
import { useScreeningsByJob } from "@/hooks/use-screening";
import { useResumesByJob } from "@/hooks/use-resume";
import { usePermissions } from "@/hooks/use-permissions";
import ScreeningResults from "@/components/dashboard/screening-results";
import CandidateKanban from "@/components/dashboard/candidate-kanban";
import { LoadingSpinner } from "@/components/common/loading-state";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  LayoutList,
  BookOpen,
  Columns3,
  TableProperties,
} from "lucide-react";
import Link from "next/link";

export default function JobScreeningPage() {
  const { jobId } = useParams();

  // 1. View state: toggle between "kanban" and "table"
  const [viewMode, setViewMode] = useState("kanban");

  // 2. Data fetching
  const { job, isLoading: jobLoading } = useJob(jobId);
  const { screenings, isLoading: screeningsLoading } = useScreeningsByJob(jobId);
  const { resumes, isLoading: resumesLoading } = useResumesByJob(jobId);
  const { canMakeDecision, canRunScreening } = usePermissions();

  const isLoading = jobLoading || screeningsLoading || resumesLoading;

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/jobs/${jobId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Candidate Pipeline</h1>
            <p className="text-muted-foreground text-sm">
              {job?.title} at {job?.company} · {screenings.length} screened candidate(s)
            </p>
          </div>
        </div>

        {/* Action Controls & View Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Toggle: Kanban vs Table */}
          <div className="flex items-center rounded-lg border bg-muted/40 p-1">
            <Button
              variant={viewMode === "kanban" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 gap-1.5 text-xs font-medium"
              onClick={() => setViewMode("kanban")}
            >
              <Columns3 className="h-3.5 w-3.5" />
              Kanban
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 gap-1.5 text-xs font-medium"
              onClick={() => setViewMode("table")}
            >
              <TableProperties className="h-3.5 w-3.5" />
              Table
            </Button>
          </div>

          {/* Quick links to Question Bank and Compare */}
          {screenings.length > 0 && (
            <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
              <Link href={`/jobs/${jobId}/question-bank`}>
                <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                Questions
              </Link>
            </Button>
          )}
          {screenings.length > 1 && (
            <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
              <Link href={`/jobs/${jobId}/compare`}>
                <LayoutList className="mr-1.5 h-3.5 w-3.5" />
                Compare
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === "kanban" ? (
        <CandidateKanban
          screenings={screenings}
          resumes={resumes}
          jobId={jobId}
          canMakeDecision={canMakeDecision}
          canRunScreening={canRunScreening}
        />
      ) : (
        <ScreeningResults screenings={screenings} />
      )}
    </div>
  );
}
