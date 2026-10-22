// src/hooks/use-interviews.js

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiClient } from "../lib/api-client";
import { toast } from "sonner";

// ── Query Keys Factory ────────────────────────────────────────────────────────
// Centralized cache keys object to ensure consistent cache invalidation
// and prevent hardcoded string typos across queries and mutations.
export const INTERVIEW_KEYS = {
  all: ["interviews"],
  candidate: (resumeId) => ["interviews", "candidate", resumeId],
  upcoming: (params = {}) => ["interviews", "upcoming", params],
};

// ── Queries (Data Fetching) ───────────────────────────────────────────────────

/**
 * Fetches all interview rounds scheduled for a specific candidate.
 * 
 * @param {string} resumeId - MongoDB ObjectId of the candidate's resume
 * @returns {Object} { interviews, isLoading, isError, error, refetch }
 */
export function useCandidateInterviews(resumeId) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: INTERVIEW_KEYS.candidate(resumeId),
    queryFn: () => api.get(`/interviews/candidate/${resumeId}`),
    // enabled guard: Prevents firing the API request when resumeId is not yet loaded
    enabled: Boolean(resumeId),
    // placeholderData: Keeps previous data on background refetches to prevent UI flickering
    placeholderData: (previousData) => previousData,
  });

  return {
    interviews: data?.data?.interviews ?? [],
    isLoading,
    isError,
    error,
    refetch,
  };
}

/**
 * Fetches all upcoming scheduled interviews across jobs accessible to the logged-in user.
 * Used on the recruiter dashboard agenda.
 * 
 * @returns {Object} { interviews, isLoading, isError, error, refetch }
 */
export function useUpcomingInterviews(params = {}) {
  const { timeframe = "all", status } = params;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: INTERVIEW_KEYS.upcoming({ timeframe, status }),
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (timeframe) searchParams.set("timeframe", timeframe);
      if (status) searchParams.set("status", status);
      const query = searchParams.toString();
      return api.get(`/interviews${query ? `?${query}` : ""}`);
    },
    // Keep previous data when re-fetching in background so UI does not jump
    placeholderData: (previousData) => previousData,
  });

  return {
    interviews: data?.data?.interviews ?? [],
    total: data?.data?.total ?? 0,
    isLoading,
    isError,
    error,
    refetch,
  };
}

// ── Mutations (Create / Update / Cancel Actions) ──────────────────────────────

/**
 * Hook to schedule a new interview round.
 * 
 * Automatic side-effects on success:
 * 1. Refreshes candidate's interview rounds list.
 * 2. Refreshes recruiter's upcoming agenda.
 * 3. Refreshes candidate audit log timeline (shows INTERVIEW_SCHEDULED event).
 * 4. Refreshes screening cache (advances candidate to "shortlisted" on Kanban board).
 */
export function useScheduleInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => api.post("/interviews", payload),
    onSuccess: (response, variables) => {
      // 1. Invalidate candidate interview list so the new round shows immediately
      queryClient.invalidateQueries({
        queryKey: INTERVIEW_KEYS.candidate(variables.resumeId),
      });

      // 2. Invalidate recruiter upcoming agenda
      queryClient.invalidateQueries({
        queryKey: INTERVIEW_KEYS.upcoming(),
      });

      // 3. Invalidate audit logs so the timeline displays "INTERVIEW_SCHEDULED"
      queryClient.invalidateQueries({
        queryKey: ["audit-logs", variables.resumeId],
      });

      // 4. Invalidate screenings so candidate card moves to "shortlisted" on the Kanban board
      queryClient.invalidateQueries({
        queryKey: ["screenings"],
      });

      toast.success("Interview scheduled! Invitation email sent to candidate.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to schedule interview");
    },
  });
}

/**
 * Hook to update or reschedule an existing interview round.
 */
export function useUpdateInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/interviews/${id}`, data),
    onSuccess: (response, variables) => {
      // 1. Invalidate candidate interview list and audit logs
      if (variables.resumeId) {
        queryClient.invalidateQueries({
          queryKey: INTERVIEW_KEYS.candidate(variables.resumeId),
        });
        queryClient.invalidateQueries({
          queryKey: ["audit-logs", variables.resumeId],
        });
      } else {
        queryClient.invalidateQueries({ queryKey: INTERVIEW_KEYS.all });
        queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      }

      // 2. Invalidate upcoming agenda
      queryClient.invalidateQueries({
        queryKey: INTERVIEW_KEYS.upcoming(),
      });

      toast.success("Interview updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update interview");
    },
  });
}

/**
 * Hook to cancel an existing interview round (soft-cancel with cancellation reason).
 */
export function useCancelInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }) =>
      apiClient(`/interviews/${id}`, {
        method: "DELETE",
        body: { reason },
      }),
    onSuccess: (response, variables) => {
      // 1. Invalidate candidate interview rounds and timeline
      if (variables.resumeId) {
        queryClient.invalidateQueries({
          queryKey: INTERVIEW_KEYS.candidate(variables.resumeId),
        });
        queryClient.invalidateQueries({
          queryKey: ["audit-logs", variables.resumeId],
        });
      } else {
        queryClient.invalidateQueries({ queryKey: INTERVIEW_KEYS.all });
        queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      }

      // 2. Invalidate upcoming agenda
      queryClient.invalidateQueries({
        queryKey: INTERVIEW_KEYS.upcoming(),
      });

      toast.success("Interview cancelled");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to cancel interview");
    },
  });
}
