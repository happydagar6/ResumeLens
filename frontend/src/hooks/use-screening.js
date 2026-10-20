import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api-client";
import { toast } from "sonner";
import { RESUME_KEYS } from "../hooks/use-resume";

// ── Query Keys Factory ────────────────────────────────────────────────────────
// Centralised object defining cache labels for screening queries so React Query manages cache cleanly.
export const SCREENING_KEYS = {
  byJob: (jobId) => ["screenings", "job", jobId],        // Dynamic cache key for all screening reports under a specific job
  detail: (screeningId) => ["screenings", screeningId],  // Dynamic cache key for a single candidate screening detail
  notes: (screeningId) => ["screenings", screeningId, "notes"],
};

// ── Queries (GET Data) ────────────────────────────────────────────────────────

// GET /api/screening/job/:jobId — fetches all screening evaluation reports for a job
export function useScreeningsByJob(jobId) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: SCREENING_KEYS.byJob(jobId),               // Unique cache key for this job's screenings
    queryFn: () => api.get(`/screening/job/${jobId}`),   // API call function that fetches screening reports
    enabled: Boolean(jobId),                              // Only run query if jobId is truthy (prevents firing when undefined)
  });

  return {
    screenings: data?.data?.screenings ?? [],             // Array of screening objects, defaults to [] while loading
    isLoading,                                            // True while HTTP request is loading
    isError,                                              // True if HTTP request failed
    error,                                                // Error object
  };
}

// GET /api/screening/:id — fetches detailed AI evaluation report for a single candidate
// Backend populates resumeId (candidateName, email) and jobId (title, company)
export function useScreening(screeningId) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: SCREENING_KEYS.detail(screeningId),         // Unique cache key for this single screening report
    queryFn: () => api.get(`/screening/${screeningId}`),  // Fetch single screening by ID
    enabled: Boolean(screeningId),                        // Only run query if screeningId exists
  });

  return {
    screening: data?.data?.screening ?? null,             // Returns single screening report object or null
    isLoading,                                            // True while loading
    isError,                                              // True if error occurred
    error,                                                // Error object
  };
}

// ── Mutations (POST / PUT / DELETE Actions) ───────────────────────────────────

// POST /api/pipeline/screen — enqueues a single candidate resume for AI screening via BullMQ
export function useRunScreening() {
  const queryClient = useQueryClient(); // Access React Query cache manager

  return useMutation({
    mutationFn: ({ resumeId }) => api.post("/pipeline/screen", { resumeId }), // API call returning HTTP 202 Accepted
    onSuccess: (_, variables) => {
      // 1. Invalidate resume list cache so resume status flips to "screening..." on the UI
      queryClient.invalidateQueries({ queryKey: RESUME_KEYS.byJob(variables.jobId) });
      // 2. Show green notification toast
      toast.success("Screening queued — processing will begin shortly");
    },
    onError: (err) => {
      toast.error(err.message || "Screening failed"); // Show red error toast
    },
  });
}

// PUT /api/screening/:id/decision — saves hiring manager's decision ("shortlisted", "rejected", "interview")
export function useMakeDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ screeningId, decision, notes = "" }) =>
      api.put(`/screening/${screeningId}/decision`, { decision, notes }), // API call to record hiring decision
    onSuccess: (_, variables) => {
      // 1. Refresh individual screening detail cache
      queryClient.invalidateQueries({
        queryKey: SCREENING_KEYS.detail(variables.screeningId),
      });
      // 2. Refresh full job candidate list cache so decision badge updates in candidate table
      if (variables.jobId) {
        queryClient.invalidateQueries({
          queryKey: SCREENING_KEYS.byJob(variables.jobId),
        });
      }
      toast.success("Decision saved successfully"); // Show success toast
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save decision"); // Show error toast
    },
  });
}

// POST /api/screening/:id/generate-email — calls AI agent to draft candidate acceptance or rejection email
export function useGenerateEmail() {
  return useMutation({
    mutationFn: ({ screeningId, emailType }) =>
      api.post(`/screening/${screeningId}/generate-email`, { emailType }), // API call generating AI email prose
    onError: (err) => {
      toast.error(err.message || "Failed to generate email draft"); // Show error toast
    },
  });
}

// POST /api/screening/:id/send-email — dispatches real email to candidate via Resend
export function useSendScreeningEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ screeningId, recipientEmail, subject, body, emailType }) =>
      api.post(`/screening/${screeningId}/send-email`, {
        recipientEmail,
        subject,
        body,
        emailType,
      }),
    onSuccess: (data) => {
      // Invalidate audit logs query so the timeline reflects the sent email
      queryClient.invalidateQueries({
        queryKey: ["audit-logs"],
      });
      toast.success(data?.message || "Email sent to candidate successfully!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to send email");
    },
  });
}


// POST /api/pipeline/batch-screen — enqueues all unscreened resumes for a job into BullMQ at once
export function useBulkScreening() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ jobId }) => api.post("/pipeline/batch-screen", { jobId }), // API call for batch screening
    onSuccess: (data, variables) => {
      // Invalidate resume list cache so status changes to "screening..." for all candidate cards
      queryClient.invalidateQueries({ queryKey: RESUME_KEYS.byJob(variables.jobId) });
      toast.success(data?.message || "Bulk screening queued successfully");
    },
    onError: (err) => {
      toast.error(err.message || "Bulk screening failed");
    }
  })
}

// POST /api/pipeline/cancel-batch — halts waiting BullMQ jobs and resets resume 
// statuses to 'parsed'
export function useCancelBatchScreening() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ jobId }) => api.post("/pipeline/cancel-batch", { jobId }),
    onSuccess: (data, variables) => {
      // Refetch the resumes list so candidate cards instantly return to "parsed" (ready to screen)
      queryClient.invalidateQueries({ queryKey: RESUME_KEYS.byJob(variables.jobId) });
      queryClient.invalidateQueries({ queryKey: SCREENING_KEYS.byJob(variables.jobId) });
      queryClient.invalidateQueries({ queryKey: ["screenings"] });
      toast.success(data?.message || "Batch screening cancelled successfully");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to cancel screening");
    },
  });
}


// ── Polling Hook (Pipeline Status Tracker) ────────────────────────────────────

// GET /api/pipeline/status/:resumeId — polls screening status every 3s until completion
export function usePipelineStatus(resumeId, enabled = false) {
    const { data, isLoading } = useQuery({
        queryKey: ["pipeline-status", resumeId],                     // Cache key for pipeline status polling
        queryFn: () => api.get(`/pipeline/status/${resumeId}`),       // Polling endpoint
        enabled: Boolean(resumeId) && enabled,                         // Only run polling when resumeId and enabled flag are true
        refetchInterval: (query) => {
            // Dynamic polling: Stop polling when resume reaches terminal state ("screened" or "error")
            const status = query.state.data?.data?.status;
            if (status === "screened" || status === "error") return false; // Stop polling!
            return 3000;                                                   // Poll every 3 seconds (3000ms)
        },
    });

    return {
        pipelineData: data?.data ?? null,                             // Pipeline status data object
        isPolling: isLoading,                                         // True while polling is active
    };
}

// ── Re-Screening Mutation ─────────────────────────────────────────────────────

// POST /api/pipeline/rescreen — clears old screening evaluation and re-runs AI pipeline
export function useRescreen() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ resumeId }) => api.post("/pipeline/rescreen", { resumeId }), // API call to re-run AI pipeline
        onSuccess: (_, variables) => {
            // Refresh both resume list cache and screening list cache
            queryClient.invalidateQueries({ queryKey: RESUME_KEYS.byJob(variables.jobId) });
            queryClient.invalidateQueries({ queryKey: SCREENING_KEYS.byJob(variables.jobId) });
            // Refresh individual screening detail cache if viewer is on that page
            if (variables.screeningId) {
                queryClient.invalidateQueries({ queryKey: SCREENING_KEYS.detail(variables.screeningId) });
            }
            toast.success("Resume re-screened successfully!"); // Show success toast
        },
        onError: (err) => {
            toast.error(err.message || "Re-screening failed"); // Show error toast
        },
    });
}

// DELETE /api/screening/:id — deletes a candidate screening record
export function useDeleteScreening() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (screeningId) => api.delete(`/screening/${screeningId}`), // API request to delete screening
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["screenings"] }); // Invalidate all screenings caches
            toast.success("Screening deleted successfully");
        },
        onError: (err) => {
            toast.error(err.message || "Failed to delete screening");
        },
    });
}

// ── AI Candidate Chat Assistant Mutation ──────────────────────────────────────

// POST /api/screening/:id/chat — sends recruiter/candidate questions to AI agent and returns AI answer
export function useCandidateChat(screeningId) {
  return useMutation({
    mutationFn: ({ userQuestion, history }) =>
      api.post(`/screening/${screeningId}/chat`, { userQuestion, history }), // API call for candidate chat assistant
    // No query cache invalidation needed — chat messages are stored in local React component state
    onError: (err) => {
      toast.error(err.message || "Chat failed. Please try again.");
    },
  });
}

// ── Audit Logs Query ──────────────────────────────────────────────────────────

// GET /api/screening/:id/audit-logs — fetches chronological history of candidate actions
export function useAuditLogs(resumeId) {
  return useQuery({
    queryKey: ["audit-logs", resumeId],                            // Cache key for candidate audit logs
    queryFn: () => api.get(`/screening/${resumeId}/audit-logs`),   // API call to fetch audit timeline
    enabled: !!resumeId,                                            // Only run query if resumeId exists
  });
}

// ── Team Collaboration & Recruiter Notes Hooks ────────────────────────────────

// GET /api/screening/:id/notes — fetches collaborative team notes for a candidate
export function useScreeningNotes(screeningId) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: SCREENING_KEYS.notes(screeningId),
    queryFn: () => api.get(`/screening/${screeningId}/notes`),
    enabled: Boolean(screeningId),
  });

  return {
    notes: data?.data?.notes ?? [],
    isLoading,
    isError,
    error,
    refetch,
  };
}

// POST /api/screening/:id/notes — adds an internal recruiter / team note
export function useAddScreeningNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ screeningId, text, category }) =>
      api.post(`/screening/${screeningId}/notes`, { text, category }),
    onSuccess: (_, variables) => {
      // 1. Invalidate notes cache so the feed refreshes immediately
      queryClient.invalidateQueries({ queryKey: SCREENING_KEYS.notes(variables.screeningId) });
      // 2. Invalidate audit logs so the timeline updates with "NOTE_ADDED"
      if (variables.resumeId) {
        queryClient.invalidateQueries({ queryKey: ["audit-logs", variables.resumeId] });
      }
      toast.success("Note added successfully");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add note");
    },
  });
}

// DELETE /api/screening/:id/notes/:noteId — deletes an internal note
export function useDeleteScreeningNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ screeningId, noteId }) =>
      api.delete(`/screening/${screeningId}/notes/${noteId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: SCREENING_KEYS.notes(variables.screeningId) });
      toast.success("Note deleted");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete note");
    },
  });
}