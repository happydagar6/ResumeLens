import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "../lib/api-client";
import { toast } from "sonner";

// Query Keys
// Centralised here so every component uses the exact same cache key strings.

export const JOB_KEYS = {
    all: ["jobs"],
    list: (params) => ["jobs", "list", params], // For paginated/filtered lists, include params in key
    detail: (jobId) => ["jobs", jobId],
};

// Query Keys
// GET /api/jobs - full lists of jobs for the logged in user
export function useJobs(params = {}) {
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([_, v]) => v !== "" && v !== undefined && v !== null)
  ).toString();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: JOB_KEYS.list(params),
    queryFn: () => api.get(`/jobs${queryString ? `?${queryString}` : ""}`),
  });

  return {
    jobs: data?.data?.jobs ?? [],
    pagination: data?.data?.pagination ?? null,
    isLoading,
    isError,
    error,
    refetch,
  }
}

// GET /api/jobs/:id - details for a single job (including associated resumes)
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

// ── PUT /api/jobs/:id/assign ───────────────────────────────────────────────────
// Assigns or removes a hiring manager from a job.
// Caller: useAssignHiringManager(jobId).mutate({ userId, action: "add"|"remove" })
export function useAssignHiringManager(jobId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, action = "add" }) =>
      api.put(`/jobs/${jobId}/assign`, { userId, action }),
    onSuccess: (_, variables) => {
      // Refresh the job detail so assignedTo list is up to date
      queryClient.invalidateQueries({ queryKey: JOB_KEYS.detail(jobId) });
      toast.success(
        variables.action === "remove"
          ? "Hiring manager removed"
          : "Hiring manager assigned"
      );
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update assignment");
    },
  });
}


// ── POST /api/jobs/:id/analyze-bias ───────────────────────────────────────────
// Triggers AI bias detection on the job's description + requirements.
// On success: invalidates the job detail cache so biasFlags re-renders immediately.

export function useAnalyzeBias(jobId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post(`/jobs/${jobId}/analyze-bias`),
    onSuccess: () => {
      // Refresh the job detail - biasFlags is now populated in the DB.
      queryClient.invalidateQueries({ queryKey: JOB_KEYS.detail(jobId) });
      toast.success("Bias analysis complete!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to analyze bias");
    },
  });
}

// ── POST /api/jobs/generate-jd ───────────────────────────────────────────────
export function useGenerateJD() {
  return useMutation({
    mutationFn: (data) => api.post("/jobs/generate-jd", data),
    onError: (err) => {
      toast.error(err.message || "Failed to generate job description");
    },
  });
}
