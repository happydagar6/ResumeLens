import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api-client";
import { toast } from "sonner";

// Query Keys
export const RESUME_KEYS = {
    byJob: (jobId) => ["resumes", "byJob", jobId],
};

// ── Queries ───────────────────────────────────────────────────────────────────

// GET /api/resumes/job/:jobId — all resumes uploaded for a specific job
export function useResumesByJob(jobId) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: RESUME_KEYS.byJob(jobId),
    queryFn: () => api.get(`/resumes/job/${jobId}`),
    enabled: Boolean(jobId),
  });

  return {
    resumes: data?.data?.resumes ?? [],
    isLoading,
    isError,
    error,
  };
}

// ── Mutations ─────────────────────────────────────────────────────────────────

// POST /api/resumes/upload — upload a resume PDF with FormData
// Caller must pass { formData, jobId } so we know which cache key to invalidate

export function useUploadResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ formData }) => api.upload("/resumes/upload", formData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: RESUME_KEYS.byJob(variables.jobId) });
      toast.success("Resume uploaded successfully!");
    },
    onError: (err) => {
      toast.error(err.message || "Upload failed");
    },
  });
}

// DELETE /api/resumes/:id — delete a resume, then refresh the job's resume list
export function useDeleteResume(jobId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (resumeId) => api.delete(`/resumes/${resumeId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESUME_KEYS.byJob(jobId) });
      toast.success("Resume deleted");
    },
    onError: (err) => {
      toast.error(err.message || "Delete failed");
    },
  });
}