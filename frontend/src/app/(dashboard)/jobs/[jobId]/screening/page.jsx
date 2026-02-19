"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import ScreeningResults from "@/components/dashboard/screening-results";
import { LoadingSpinner } from "@/components/common/loading-state";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function JobScreeningPage() {
  const { jobId } = useParams();
  const [screenings, setScreenings] = useState([]);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [screeningData, jobData] = await Promise.all([
          api.get(`/screening/job/${jobId}`),
          api.get(`/jobs/${jobId}`),
        ]);
        setScreenings(screeningData.data?.screenings || []);
        setJob(jobData.data?.job);
      } catch {
        setScreenings([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [jobId]);

  if (loading) return <LoadingSpinner />;

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
