import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api-client";
import { toast } from "sonner";
import { RESUME_KEYS } from "../hooks/use-resume";

// ── Query Keys ────────────────────────────────────────────────────────────────
export const SCREENING_KEYS = {
  byJob: (jobId) => ["screenings", "job", jobId],
  detail: (screeningId) => ["screenings", screeningId],
};

// ── Queries ───────────────────────────────────────────────────────────────────

// GET /api/screening/job/:jobId — all screening results for a job
export function useScreeningsByJob(jobId) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: SCREENING_KEYS.byJob(jobId),
    queryFn: () => api.get(`/screening/job/${jobId}`),
    enabled: Boolean(jobId),
  });

  return {
    screenings: data?.data?.screenings ?? [],
    isLoading,
    isError,
    error,
  };
}

// GET /api/screening/:id — single screening detail
// Backend populates resumeId (candidateName, email) and jobId (title, company)
export function useScreening(screeningId) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: SCREENING_KEYS.detail(screeningId),
    queryFn: () => api.get(`/screening/${screeningId}`),
    enabled: Boolean(screeningId),
  });

  return {
    screening: data?.data?.screening ?? null,
    isLoading,
    isError,
    error,
  };
}

// ── Mutations ─────────────────────────────────────────────────────────────────

// POST /api/screening — run the AI pipeline on a resume
// Caller passes { resumeId, jobId } — jobId is used only for cache invalidation
export function useRunScreening() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ resumeId }) => api.post("/pipeline/screen", { resumeId }), // Uses LangGraph pipeline (Phase 4)
    onSuccess: (_, variables) => {
      // Refresh the resume list (status changes from "parsed" → "screened")
      queryClient.invalidateQueries({ queryKey: RESUME_KEYS.byJob(variables.jobId) });
      // Refresh the screenings list for this job
      queryClient.invalidateQueries({ queryKey: SCREENING_KEYS.byJob(variables.jobId) });
      toast.success("Resume screened successfully!");
    },
    onError: (err) => {
      toast.error(err.message || "Screening failed");
    },
  });
}

// ── PUT /api/screening/:id/decision ───────────────────────────────────────────
// Records the hiring manager's manual decision on a candidate.
// Caller: useMakeDecision().mutate({ screeningId, decision, notes?, jobId? })
export function useMakeDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ screeningId, decision, notes = "" }) =>
      api.put(`/screening/${screeningId}/decision`, { decision, notes }),
    onSuccess: (_, variables) => {
      // Refresh the individual screening detail
      queryClient.invalidateQueries({
        queryKey: SCREENING_KEYS.detail(variables.screeningId),
      });
      // Refresh the job's full candidate list so the decision shows in the table
      if (variables.jobId) {
        queryClient.invalidateQueries({
          queryKey: SCREENING_KEYS.byJob(variables.jobId),
        });
      }
      toast.success("Decision saved successfully");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save decision");
    },
  });
}

// ── POST /api/screening/:id/generate-email ────────────────────────────────────
// Calls the AI to draft an email for the candidate.
// Returns { subject, body } via mutation.data after success.
export function useGenerateEmail() {
  return useMutation({
    mutationFn: ({ screeningId, emailType }) =>
      api.post(`/screening/${screeningId}/generate-email`, { emailType }),
    onError: (err) => {
      toast.error(err.message || "Failed to generate email draft");
    },
  });
}