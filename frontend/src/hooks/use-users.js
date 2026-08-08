import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api-client";

// ── Query Keys Factory ────────────────────────────────────────────────────────
// Centralised object defining cache keys for user queries so React Query manages memory cache cleanly.
export const USER_KEYS = {
  all: ["users"],                            // Base cache key for overall user queries
  byRole: (role) => ["users", "role", role], // Dynamic cache key array for users filtered by role e.g. ["users", "role", "hiring_manager"]
};

// ── Queries (GET Data) ────────────────────────────────────────────────────────

/**
 * useHiringManagers
 *
 * Fetches list of team members with role = "hiring_manager" in the organization.
 * Used in select dropdowns when creating/editing job postings to assign a hiring manager.
 * Pass `enabled: false` to skip the API request if the logged-in user lacks permissions.
 */
export function useHiringManagers({ enabled = true } = {}) {
  // useQuery handles automatic data fetching, 5-minute caching, loading, and error states
  const { data, isLoading, isError, error } = useQuery({
    queryKey: USER_KEYS.byRole("hiring_manager"),         // Unique cache key for hiring manager list
    queryFn: () => api.get("/users?role=hiring_manager"),  // API request function to fetch hiring managers from backend
    staleTime: 5 * 60 * 1000,                             // Cache data for 5 minutes (5 * 60 * 1000 ms) as team members change rarely
    enabled,                                              // Only execute query if enabled is true (prevents execution for unauthorized users)
  });

  return {
    hiringManagers: data?.data?.users ?? [],              // Returns array of hiring manager objects, defaults to [] while loading
    isLoading,                                            // True while the HTTP network request is in progress
    isError,                                              // True if the API call returned an error status
    error,                                                // Error object containing server error details
  };
}

