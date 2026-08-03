"use client";

import { useParams } from "next/navigation";
import { useJob, useUpdateJob } from "@/hooks/use-jobs";
import JobForm from "@/components/dashboard/job-form";
import { LoadingSpinner } from "@/components/common/loading-state";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function EditJobPage() {
  const { jobId } = useParams();
  const { job, isLoading } = useJob(jobId); 
  const updateMutation = useUpdateJob(jobId);

  if (isLoading) return <LoadingSpinner />;
  if (!job) return <p className="text-muted-foreground">Job not found.</p>;

  const handleUpdate = async (data) => {
    // useUpdateJob onSuccess handles: toast, cache invalidation, router.push(/jobs/jobId)
    await updateMutation.mutateAsync(data);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back navigation */}
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href={`/jobs/${jobId}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Job
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Job</h1>
        <p className="text-muted-foreground">Update the job posting details.</p>
      </div>

      <JobForm
        onSubmit={handleUpdate}
        submitLabel="Update Job"
        defaultValues={{
          ...job,
          // Convert skills array → comma-separated string for the form field
          skills: job.skills?.join(", ") ?? "",
        }}
      />
    </div>
  );
}
