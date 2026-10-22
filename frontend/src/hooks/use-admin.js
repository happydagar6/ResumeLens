// src/hooks/use-admin.js
// React Query hooks for the admin user management panel.
// Only called from /admin/users — guarded by isAdmin check in that page.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api-client";
import { toast } from "sonner";

// Query keys
export const ADMIN_KEYS = {
    users: (params) => ["admin", "users", params], // e.g. ["admin", "users", { page: 1, search: "john" }]
};

// ── useAdminUsers ─────────────────────────────────────────────────────────────
// Fetches the full user list for the org with pagination + filtering.
// params: { page, limit, search, role }
export function useAdminUsers(params = {} ) {
    const query = new URLSearchParams();
    if (params.page)   query.set("page",   params.page);
    if (params.limit)  query.set("limit",  params.limit);
    if (params.search) query.set("search", params.search);
    if (params.role && params.role !== "all") query.set("role", params.role);

    const { data, isLoading, isError } = useQuery({
        queryKey: ADMIN_KEYS.users(params),
        queryFn: () => api.get(`/admin/users?${query.toString()}`),
        staleTime: 50 * 1000, // 50 seconds
    });

    return {
        users: data?.data?.users ?? [],
        pagination: data?.data?.pagination ?? null,
        isLoading,
        isError,
    }
}

// ── useUpdateUserRole ─────────────────────────────────────────────────────────
// PUT /api/admin/users/:id/role — changes a user's role.
// On success: invalidates the user list so the table refreshes with new data.

export function useUpdateUserRole() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ userId, role }) =>
            api.put(`/admin/users/${userId}/role`, { role }),
        onSuccess: (data) => {
            toast.success(data.message || "Role updated successfully");
            queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
        },
        onError: (err) => {
            toast.error(err.message || "Failed to update role");
        },
    });
}

// ── useDeactivateUser ─────────────────────────────────────────────────────────
// DELETE /api/admin/users/:id — soft-deactivates a user.
export function useDeactivateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (userId) => api.delete(`/admin/users/${userId}`),
        onSuccess: (data) => {
            toast.success(data.message || "User deactivated");
            queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
        },
        onError: (err) => {
            toast.error(err.message || "Failed to deactivate user");
        },
    });
}

// ── useReactivateUser ─────────────────────────────────────────────────────────
// PATCH /api/admin/users/:id/reactivate — re-enables a deactivated user.
export function useReactivateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (userId) => api.patch(`/admin/users/${userId}/reactivate`),
        onSuccess: (data) => {
            toast.success(data.message || "User reactivated");
            queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
        },
        onError: (err) => {
            toast.error(err.message || "Failed to reactivate user");
        },
    });
}

// ── useAdminAuditLogs ─────────────────────────────────────────────────────────
// Fetches the security audit trail with pagination and action filtering.
// Only accessible by organization admins.
export function useAdminAuditLogs(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.set("page", params.page);
    if (params.limit) query.set("limit", params.limit);
    if (params.action && params.action !== "all") query.set("action", params.action);

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["admin", "audit-logs", params],
        queryFn: () => api.get(`/admin/audit-logs?${query.toString()}`),
        staleTime: 30 * 1000, // cache for 30 seconds
    });

    return {
        logs: data?.data?.logs ?? [],
        pagination: data?.data?.pagination ?? null,
        isLoading,
        isError,
        refetch,
    };
}