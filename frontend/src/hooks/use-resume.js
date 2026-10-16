import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api-client";
import { toast } from "sonner";

// ── Query Keys Factory ────────────────────────────────────────────────────────
// Centralised object defining cache keys for resumes so React Query can manage cache cleanly.
export const RESUME_KEYS = {
    byJob: (jobId) => ["resumes", "byJob", jobId], // Generates a unique cache array label like ["resumes", "byJob", "123"]
    candidates: (params) => ["resumes", "candidates", params],
};

export function useCandidates(params = {}) {
  // Filter out empty strings, null, undefined, or "all" to keep URL clean
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== "" && v !== undefined && v !== null && v !== "all")
  );
  const queryString = new URLSearchParams(cleanParams).toString();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: RESUME_KEYS.candidates(params),
    queryFn: () => api.get(`/resumes/candidates${queryString ? `?${queryString}` : ""}`),
    placeholderData: (previousData) => previousData,
  });

  return {
    candidates: data?.data?.candidates ?? [],
    pagination: data?.data?.pagination ?? { total: 0, page: 1, pages: 0, limit: 10 },
    jobs: data?.data?.jobs ?? [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  };
}


// ── Queries (GET Data) ────────────────────────────────────────────────────────

// GET /api/resumes/job/:jobId — fetches all candidate resumes uploaded for a specific job
export function useResumesByJob(jobId) {
  // useQuery handles automatic data fetching, caching, loading, and error states
  const { data, isLoading, isError, error } = useQuery({
    queryKey: RESUME_KEYS.byJob(jobId),                 // Unique cache key for this job's resume list
    queryFn: () => api.get(`/resumes/job/${jobId}`),   // API call function that hits backend endpoint
    enabled: Boolean(jobId),                            // Prevents query from running if jobId is undefined or null
  });

  return {
    resumes: data?.data?.resumes ?? [],                 // Array of resume objects, defaults to [] while loading
    isLoading,                                          // True while the HTTP request is in progress
    isError,                                            // True if the API call returns an error status
    error,                                              // Error object containing the server error message
  };
}

// ── Mutations (POST / DELETE Data) ────────────────────────────────────────────

// POST /api/resumes/upload — uploads a candidate PDF resume file using FormData
export function useUploadResume() {
  const queryClient = useQueryClient(); // Access React Query cache manager

  return useMutation({
    mutationFn: ({ formData }) => api.upload("/resumes/upload", formData), // API call sending multipart/form-data
    onSuccess: (_, variables) => {
      // 1. Tell React Query: "The cached resume list for this job is now outdated. Go refetch it automatically!"
      queryClient.invalidateQueries({ queryKey: RESUME_KEYS.byJob(variables.jobId) });
      // 2. Show a green success toast notification
      toast.success("Resume uploaded successfully!");
    },
    onError: (err) => {
      toast.error(err.message || "Upload failed"); // Show a red error toast notification if upload fails
    },
  });
}

// DELETE /api/resumes/:id — deletes a candidate resume from database and Cloudinary
export function useDeleteResume(jobId) {
  const queryClient = useQueryClient(); // Access React Query cache manager

  return useMutation({
    mutationFn: (resumeId) => api.delete(`/resumes/${resumeId}`), // API request to delete resume by ID
    onSuccess: () => {
      // Invalidate both resumes and screenings caches globally so UI components refresh immediately
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
      queryClient.invalidateQueries({ queryKey: ["screenings"] });
      toast.success("Resume deleted"); // Show green toast
    },
    onError: (err) => {
      toast.error(err.message || "Delete failed"); // Show red error toast
    },
  });
}
