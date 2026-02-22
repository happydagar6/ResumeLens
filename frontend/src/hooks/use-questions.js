import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api-client";
import { toast } from "sonner";

// ── Query Keys ────────────────────────────────────────────────────────────────
export const QUESTION_KEYS = {
    byScreening: (screeningId) => ["questions", screeningId],
    bank: (jobId) => ["questions", "bank", jobId],
};

// ── Queries ───────────────────────────────────────────────────────────────────

// GET /api/questions/screening/:screeningId — per-screening questions
// Returns null when no questions have been generated yet (404 = not an error)
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
        questions: data?.data?.questions ?? null,
        isLoading,
        isError,
    };
}

// GET /api/questions/bank/:jobId — all questions for a job across all screenings
export function useQuestionBank(jobId) {
    const { data, isLoading, isError, error } = useQuery({
        queryKey: QUESTION_KEYS.bank(jobId),
        queryFn: () => api.get(`/questions/bank/${jobId}`),
        enabled: Boolean(jobId),
        staleTime: 30 * 1000,
    });

    return {
        bank: data?.data ?? null,
        isLoading,
        isError,
        error,
    };
}

// ── Mutations ─────────────────────────────────────────────────────────────────

// POST /api/questions/generate — generate questions for one screening
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

// PATCH /api/questions/:docId/toggle-used — toggle usedInInterview on a question
// jobId is passed so the question bank cache is invalidated on success
export function useToggleUsed(jobId) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ docId, questionId }) =>
            api.patch(`/questions/${docId}/toggle-used`, { questionId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUESTION_KEYS.bank(jobId) });
        },
        onError: (err) => {
            toast.error(err.message || "Failed to update question status");
        },
    });
}