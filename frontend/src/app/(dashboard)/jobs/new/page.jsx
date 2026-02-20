"use client";

import { useCreateJob } from "@/hooks/use-jobs";
import JobForm from "@/components/dashboard/job-form";

export default function NewJobPage() {
  // Navigation + cache invalidation + toast all handled inside useCreateJob onSuccess
  const { mutateAsync, isPending } = useCreateJob();

  const handleCreate = async (data) => {
    await mutateAsync(data);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create New Job</h1>
        <p className="text-muted-foreground">
          Fill in the details to create a new job posting.
        </p>
      </div>
      <JobForm onSubmit={handleCreate} isSubmitting={isPending} />
    </div>
  );
}
