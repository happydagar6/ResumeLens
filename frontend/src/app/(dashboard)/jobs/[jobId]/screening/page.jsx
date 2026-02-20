"use client";

import { useParams } from "next/navigation";
import { useJob } from "@/hooks/use-jobs";
import { useScreeningsByJob } from "@/hooks/use-screening";
import ScreeningResults from "@/components/dashboard/screening-results";
import { LoadingSpinner } from "@/components/common/loading-state";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function JobScreeningPage() {
  const { jobId } = useParams();
  const { job, isLoading: jobLoading } = useJob(jobId);
  const { screenings, isLoading: screeningsLoading } = useScreeningsByJob(jobId);

  const isLoading = jobLoading || screeningsLoading;

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/jobs/${jobId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Screening Results</h1>
          <p className="text-muted-foreground">
            {job?.title} at {job?.company} · {screenings.length} candidate(s) screened
          </p>
        </div>
      </div>

      <ScreeningResults screenings={screenings} />
    </div>
  );
}
