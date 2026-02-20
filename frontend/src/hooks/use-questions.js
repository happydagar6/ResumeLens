import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api-client";
import { toast } from "sonner";

// ── Query Keys ────────────────────────────────────────────────────────────────
export const QUESTION_KEYS = {
  byScreening: (screeningId) => ["questions", screeningId],
};


// ── Queries ───────────────────────────────────────────────────────────────────

// GET /api/questions/screening/:screeningId — fetch existing questions
// Returns null (not an error) when no questions have been generated yet
export function useQuestions(screeningId) {
  const { data, isLoading, isError } = useQuery({
    queryKey: QUESTION_KEYS.byScreening(screeningId),
    queryFn: async () => {
      try {
        return await api.get(`/questions/screening/${screeningId}`);
      } catch (err) {
        // 404 means no questions yet — treat as null, not an error
        if (err.status === 404) return null;
        throw err;
      }
    },
    enabled: Boolean(screeningId),
  });

  return {
    // data is null when 404 (no questions yet), or the interviewQuestion document
    questions: data?.data?.questions ?? null,
    isLoading,
    isError,
  };
}

// ── Mutations ─────────────────────────────────────────────────────────────────

// POST /api/questions/generate — generate interview questions for a screening
export function useGenerateQuestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ screeningId }) =>
      api.post("/questions/generate", { screeningId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUESTION_KEYS.byScreening(variables.screeningId),
      });
      toast.success("Interview questions generated!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to generate questions");
    },
  });
}