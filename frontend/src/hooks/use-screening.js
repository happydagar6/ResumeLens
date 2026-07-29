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
    mutationFn: ({ resumeId }) => api.post("/pipeline/screen", { resumeId }),
    onSuccess: (_, variables) => {
      // The API returns 202 — screening is queued, not done yet.
      // Invalidate resume list so status shows "screening"
      queryClient.invalidateQueries({ queryKey: RESUME_KEYS.byJob(variables.jobId) });
      toast.success("Screening queued — processing will begin shortly");
      // NOTE: The component using this hook should now enable usePipelineStatus
      // polling to track when it completes.
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

// ── POST /api/pipeline/batch-screen ───────────────────────────────────────────
// Queues all parsed resumes for a job into BullMQ.
// On success: invalidates resume list (status changes to screening).

export function useBulkScreening() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ jobId }) => api.post("/pipeline/batch-screen", { jobId }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: RESUME_KEYS.byJob(variables.jobId) });
      toast.success(data?.message || "Bulk screening queued successfully");
    },
    onError: (err) => {
      toast.error(err.message || "Bulk screening failed");
    }
  })
}

// ── Poll pipeline status until screening completes ────────────────────────────
// Used after triggering a screen — polls every 3s until resume.status is final.
export function usePipelineStatus(resumeId, enabled = false) {
    const { data, isLoading } = useQuery({
        queryKey: ["pipeline-status", resumeId],
        queryFn: () => api.get(`/pipeline/status/${resumeId}`),
        enabled: Boolean(resumeId) && enabled,
        refetchInterval: (query) => {
            // Stop polling once the resume reaches a terminal state
            const status = query.state.data?.data?.status;
            if (status === "screened" || status === "error") return false;
            return 3000; // poll every 3 seconds
        },
    });

    return {
        pipelineData: data?.data ?? null,
        isPolling: isLoading,
    };
}

// ── POST /api/pipeline/rescreen ───────────────────────────────────────────────
// Deletes old screening + questions, re-runs the AI pipeline.
// Caller: useRescreen().mutate({ resumeId, screeningId, jobId })
export function useRescreen() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ resumeId }) => api.post("/pipeline/rescreen", { resumeId }),
        onSuccess: (_, variables) => {
            // Refresh both resume list + screening list
            queryClient.invalidateQueries({ queryKey: RESUME_KEYS.byJob(variables.jobId) });
            queryClient.invalidateQueries({ queryKey: SCREENING_KEYS.byJob(variables.jobId) });
            // Refresh the individual screening detail (in case user is on that page)
            if (variables.screeningId) {
                queryClient.invalidateQueries({ queryKey: SCREENING_KEYS.detail(variables.screeningId) });
            }
            toast.success("Resume re-screened successfully!");
        },
        onError: (err) => {
            toast.error(err.message || "Re-screening failed");
        },
    });
}

// ── DELETE /api/screening/:id ─────────────────────────────────────────────────
// Deletes a screening directly (useful for orphaned screenings)
export function useDeleteScreening() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (screeningId) => api.delete(`/screening/${screeningId}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["screenings"] });
            toast.success("Screening deleted successfully");
        },
        onError: (err) => {
            toast.error(err.message || "Failed to delete screening");
        },
    });
}


// ── POST /api/screening/:id/chat ──────────────────────────────────────────────
// Sends a question + full history to the backend and returns the AI's answer.
// This is a useMutation (not useQuery) because it's triggered on user action.
// We do NOT use react-query cache here — chat is purely transient in-memory state.
export function useCandidateChat(screeningId) {
  return useMutation({
    mutationFn: ({ userQuestion, history }) =>
      api.post(`/screening/${screeningId}/chat`, { userQuestion, history }),
    // No onSuccess cache invalidation needed — we update local state in the component
    onError: (err) => {
      toast.error(err.message || "Chat failed. Please try again.");
    },
  });
}

// ── GET /api/screening/:id/audit-logs ─────────────────────────────────────────
export function useAuditLogs(resumeId) {
  return useQuery({
    queryKey: ["audit-logs", resumeId],
    queryFn: () => api.get(`/screening/${resumeId}/audit-logs`),
    enabled: !!resumeId,
  });
}
