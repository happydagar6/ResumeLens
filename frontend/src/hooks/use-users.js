import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api-client";

// ── Query Keys ────────────────────────────────────────────────────────────────
export const USER_KEYS = {
  all: ["users"],
  byRole: (role) => ["users", "role", role],
};

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * useHiringManagers
 *
 * Fetches the list of users with role = "hiring_manager".
 * Pass `enabled: false` to skip the request (e.g. for hiring managers themselves,
 * who cannot assign and don't need this list).
 */
export function useHiringManagers({ enabled = true } = {}) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: USER_KEYS.byRole("hiring_manager"),
    queryFn: () => api.get("/users?role=hiring_manager"),
    // Cache for 5 minutes — hiring manager list changes infrequently
    staleTime: 5 * 60 * 1000,
    enabled,
  });

  return {
    hiringManagers: data?.data?.users ?? [],
    isLoading,
    isError,
    error,
  };
}
