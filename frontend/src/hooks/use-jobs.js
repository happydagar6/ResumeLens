import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "../lib/api-client";
import { toast } from "sonner";

// ── Query Keys Factory ────────────────────────────────────────────────────────
// Centralised object defining cache keys so every component uses the exact same cache labels.
export const JOB_KEYS = {
    all: ["jobs"],                                      // Base key for all job queries
    list: (params) => ["jobs", "list", params],         // Dynamic key including search/filter params for paginated job lists
    detail: (jobId) => ["jobs", jobId],                 // Dynamic key for a specific single job detail
};

// ── Queries (GET Data) ────────────────────────────────────────────────────────

// GET /api/jobs — fetches full paginated & filtered list of jobs for the logged in user
export function useJobs(params = {}) {
  // Convert { search: "React", status: "open", type: "" } → "search=React&status=open"
  // Object.entries gets key-value pairs, .filter removes empty strings/null/undefined, URLSearchParams converts to query string
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([_, v]) => v !== "" && v !== undefined && v !== null)
  ).toString(); 

  // useQuery handles automatic fetching, caching, loading, and error states
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: JOB_KEYS.list(params),                                   // Unique cache key based on current params
    queryFn: () => api.get(`/jobs${queryString ? `?${queryString}` : ""}`), // API request function
  });

  return {
    jobs: data?.data?.jobs ?? [],               // Returns array of jobs, defaults to empty array [] if loading
    pagination: data?.data?.pagination ?? null, // Returns pagination info (page, total, pages)
    isLoading,                                  // True while network request is in progress
    isError,                                    // True if request failed
    error,                                      // Error object if request failed
    refetch,                                    // Function to manually trigger a refetch
  }
}

// GET /api/jobs/:id — fetches details for a single job by its ID
export function useJob(jobId) {
    const { data, isLoading, isError, error } = useQuery({
        queryKey: JOB_KEYS.detail(jobId),       // Unique cache key for this specific job
        queryFn: () => api.get(`/jobs/${jobId}`),// Fetch job by ID
        enabled: Boolean(jobId),                // Only run query if jobId is truthy (prevents firing when undefined)
    });

    return {
        job: data?.data?.job ?? null,           // Returns single job object or null
        isLoading,                              // True while loading
        isError,                                // True if error occurred
        error,                                  // Error object
    };
}

// ── Mutations (POST / PUT / DELETE) ───────────────────────────────────────────

// POST /api/jobs — creates a new job posting, invalidates cache, and redirects to /jobs page
export function useCreateJob() {
    const queryClient = useQueryClient(); // React Query client instance to manage cache
    const router = useRouter();          // Next.js router instance to handle page redirection

    return useMutation({
        mutationFn: (jobData) => api.post("/jobs", jobData), // API request to create new job
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: JOB_KEYS.all }); // Tell React Query to refresh all job list caches
            toast.success("Job created successfully!");                // Display green success toast message
            router.push("/jobs");                                      // Redirect user to the jobs list page
        },
        onError: (err) => {
            toast.error(err.message || "Failed to create job. Please try again."); // Display red error toast
        },
    });
}

// PUT /api/jobs/:id — updates an existing job, refreshes detail + list caches, and redirects to detail page
export function useUpdateJob(jobId) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (jobData) => api.put(`/jobs/${jobId}`, jobData), // API request to update job
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JOB_KEYS.all });        // Refresh overall jobs list cache
      queryClient.invalidateQueries({ queryKey: JOB_KEYS.detail(jobId) });// Refresh this specific job's detail cache
      toast.success("Job updated successfully!");                      // Show success toast
      router.push(`/jobs/${jobId}`);                                   // Redirect to updated job detail page
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update job");             // Show error toast
    },
  });
}

// DELETE /api/jobs/:id — deletes a job, removes its detail cache, and redirects to /jobs
export function useDeleteJob() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (jobId) => api.delete(`/jobs/${jobId}`), // API request to delete job
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: JOB_KEYS.all });         // Refresh overall jobs list cache
      queryClient.removeQueries({ queryKey: JOB_KEYS.detail(jobId) });  // Remove deleted job's detail cache completely
      toast.success("Job deleted");                                     // Show success toast
      router.push("/jobs");                                             // Redirect to jobs list page
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete job");             // Show error toast
    },
  });
}

// PUT /api/jobs/:id/assign — assigns or removes a hiring manager from a job
export function useAssignHiringManager(jobId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, action = "add" }) =>
      api.put(`/jobs/${jobId}/assign`, { userId, action }), // API request to add or remove hiring manager
    onSuccess: (_, variables) => {
      // Refresh the job detail cache so assignedTo list re-renders with up-to-date managers
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

// POST /api/jobs/:id/analyze-bias — triggers AI DEI bias detection agent on job text
export function useAnalyzeBias(jobId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post(`/jobs/${jobId}/analyze-bias`), // API call to trigger AI bias detection agent
    onSuccess: () => {
      // Refresh job detail cache so biasFlags re-render immediately on the UI
      queryClient.invalidateQueries({ queryKey: JOB_KEYS.detail(jobId) });
      toast.success("Bias analysis complete!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to analyze bias");
    },
  });
}

// POST /api/jobs/generate-jd — calls AI job description generator agent to draft a job description from keywords
export function useGenerateJD() {
  return useMutation({
    mutationFn: (data) => api.post("/jobs/generate-jd", data), // API call to generate AI job description
    onError: (err) => {
      toast.error(err.message || "Failed to generate job description"); // Show error toast if generation fails
    },
  });
}