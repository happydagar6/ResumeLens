"use client";

import { useAuth } from "./use-auth";

/**
 * usePermissions
 *
 * Returns boolean flags derived from the current user's role.
 * Components import these flags instead of checking `user.role` directly,
 * so permission rules live in one place and are easy to update.
 */
export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role;

  return {
    // Job operations
    canCreateJob: ["recruiter", "admin"].includes(role),
    canEditJob: ["recruiter", "admin"].includes(role),
    canDeleteJob: ["recruiter", "admin"].includes(role),

    // Resume operations
    canUploadResume: ["recruiter", "admin"].includes(role),
    canDeleteResume: ["recruiter", "admin"].includes(role),

    // Screening
    canRunScreening: ["recruiter", "admin"].includes(role),

    // Question generation (hiring managers can also generate for their assigned jobs)
    canGenerateQuestions: ["recruiter", "admin", "hiring_manager"].includes(role),

    // Hiring manager decision — only hiring_manager and admin can record decisions
    canMakeDecision: ["hiring_manager", "admin"].includes(role),

    // Only recruiter/admin can assign hiring managers to jobs
    canAssignHiringManager: ["recruiter", "admin"].includes(role),

    // Convenience role booleans
    isAdmin: role === "admin",
    isHiringManager: role === "hiring_manager",
    isRecruiter: role === "recruiter",

    role,
  };
}
