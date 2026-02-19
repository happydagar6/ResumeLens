"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import JobForm from "@/components/dashboard/job-form";
import { toast } from "sonner";

export default function NewJobPage() {
  const router = useRouter();

  const handleCreate = async (data) => {
    try {
      await api.post("/jobs", data);
      toast.success("Job created successfully!");
      router.push("/jobs");
    } catch (err) {
      toast.error(err.message || "Failed to create job");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create New Job</h1>
        <p className="text-muted-foreground">
          Fill in the details to create a new job posting.
        </p>
      </div>
      <JobForm onSubmit={handleCreate} />
    </div>
  );
}
