import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "../lib/api-client";
import { toast } from "sonner";

// Query Keys
// Centralised here so every component uses the exact same cache key strings.

export const JOB_KEYS = {
    all: ["jobs"],
    detail: (jobId) => ["jobs", jobId],
};

// Query Keys
// GET /api/jobs - full lists of jobs for the logged in user
export function useJobs() {
    const { data, isLoading, isError, error } = useQuery({
        queryKey: JOB_KEYS.all,
        queryFn: () => api.get("/jobs"),
    });

    return {
        jobs: data?.data?.jobs ?? [],
        isLoading,
        isError,
        error,
    };
}

// GET /api/jobs/:dd - details for a single job (including associated resumes)
export function useJob(jobId) {
    const { data, isLoading, isError, error } = useQuery({
        queryKey: JOB_KEYS.detail(jobId),
        queryFn: () => api.get(`/jobs/${jobId}`),
        enabled: Boolean(jobId),
    });

    return {
        job: data?.data?.job ?? null,
        isLoading,
        isError,
        error,
    };
}

// ── Mutations ─────────────────────────────────────────────────────────────────

// POST /api/jobs — create a new job, then redirect to /jobs
export function useCreateJob() {
    const queryClient = useQueryClient();
    const router = useRouter();

    return useMutation({
        mutationFn: (jobData) => api.post("/jobs", jobData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: JOB_KEYS.all }); // Refresh job list
            toast.success("Job created successfully!");
            router.push("/jobs"); // Redirect to job list
        },
        onError: (err) => {
            toast.error(err.message || "Failed to create job. Please try again.");
        },
    });
}

// PUT /api/jobs/:id - update a job, refresh its detail + list cache
export function useUpdateJob(jobId) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (jobData) => api.put(`/jobs/${jobId}`, jobData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JOB_KEYS.all });
      queryClient.invalidateQueries({ queryKey: JOB_KEYS.detail(jobId) });
      toast.success("Job updated successfully!");
      router.push(`/jobs/${jobId}`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update job");
    },
  });
}

// DELETE /api/jobs/:id — delete a job, clear its cache, redirect to /jobs
export function useDeleteJob() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (jobId) => api.delete(`/jobs/${jobId}`),
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: JOB_KEYS.all });
      queryClient.removeQueries({ queryKey: JOB_KEYS.detail(jobId) });
      toast.success("Job deleted");
      router.push("/jobs");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete job");
    },
  });
}