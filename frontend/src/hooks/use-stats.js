import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

// ── Query Keys ────────────────────────────────────────────────────────────────
export const STATS_KEYS = {
  overview: ["stats", "overview"],
  byJob: (jobId) => ["stats", "job", jobId],
};

// ── Queries ───────────────────────────────────────────────────────────────────

// GET /api/stats/overview — site-wide aggregate stats
// staleTime 2 minutes: stats don't need live updates per keystroke
export function useOverviewStats() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: STATS_KEYS.overview,
    queryFn: () => api.get("/stats/overview"),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // data.data shape: { jobs, resumes, screening, recentJobs }
  return {
    stats: data?.data ?? null,
    isLoading,
    isError,
    error,
  };
}

// GET /api/stats/job/:jobId — per-job stats (score distribution, top candidates)
export function useJobStats(jobId) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: STATS_KEYS.byJob(jobId),
    queryFn: () => api.get(`/stats/job/${jobId}`),
    enabled: Boolean(jobId),
    staleTime: 2 * 60 * 1000,
  });

  return {
    jobStats: data?.data ?? null,
    isLoading,
    isError,
    error,
  };
}

// GET /api/jobs/:jobId/analytics — pipeline funnel for a specific job
// Returns { funnel, decisions, totals }
export function useJobAnalytics(jobId) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["analytics", "job", jobId],
    queryFn: () => api.get(`/jobs/${jobId}/analytics`),
    enabled: Boolean(jobId),
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    analytics: data?.data ?? null,
    isLoading,
    isError,
    error,
  };
}

// GET /api/stats/activity — recent activity feed for dashboard
export function useActivityFeed() {
  const { data, isLoading } = useQuery({
    queryKey: ["stats", "activity"],
    queryFn: () => api.get("/stats/activity"),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
  return {
    activities: data?.data?.activities ?? [],
    isLoading,
  };
}

// DELETE /api/stats/activity — clears the activity feed for the user
export function useClearActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete("/stats/activity"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stats", "activity"] });
    },
  });
}