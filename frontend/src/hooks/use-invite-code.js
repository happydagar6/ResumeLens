"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { usePermissions } from "@/hooks/use-permissions";

// GET /api/auth/invite-code
// Only fetched for recruiters and admins — they are the ones who share invite links with HMs
export function useInviteCode() {
  const { canAssignHiringManager } = usePermissions();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["inviteCode"],
    queryFn: () => api.get("/auth/invite-code"),
    enabled: canAssignHiringManager, // Skip for hiring managers
    staleTime: Infinity, // Invite code never changes, no need to re-fetch
  });

  return {
    inviteCode: data?.data?.inviteCode ?? null,
    orgName: data?.data?.orgName ?? null,
    isLoading,
    isError,
  };
}
