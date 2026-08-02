import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api-client";
import { toast } from "sonner";

// Query Keys
export const RESUME_KEYS = {
    byJob: (jobId) => ["resumes", "byJob", jobId], // What is this line doing, make me understand: it returns an array of keys for the query
};

// ── Queries ───────────────────────────────────────────────────────────────────

// GET /api/resumes/job/:jobId — all resumes uploaded for a specific job
export function useResumesByJob(jobId) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: RESUME_KEYS.byJob(jobId), // returns an array of keys for the query
    queryFn: () => api.get(`/resumes/job/${jobId}`), // function that fetches the data
    enabled: Boolean(jobId), // only run the query if jobId is truthy
  });

  return {
    resumes: data?.data?.resumes ?? [], // array of resumes, empty array if no data
    isLoading, // boolean indicating if data is loading
    isError, // boolean indicating if there was an error
    error, // error object if there was an error
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
      // Invalidate both resumes and screenings globally so whichever page they land on gets fresh data
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
      queryClient.invalidateQueries({ queryKey: ["screenings"] });
      toast.success("Resume deleted");
    },
    onError: (err) => {
      toast.error(err.message || "Delete failed");
    },
  });
}