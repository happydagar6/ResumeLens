import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import { api } from "../lib/api-client";
import { toast } from "sonner";

// PUT /api/auth/profile — update name + company
export function useUpdateProfile() {
  const { checkAuth } = useAuth();  // re-fetch the user after update

  return useMutation({
    mutationFn: (data) => api.put("/auth/profile", data),
    onSuccess: async () => {
      await checkAuth(); // re-sync user state in AuthContext
      toast.success("Profile updated successfully");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update profile");
    },
  });
}

// PUT /api/auth/password — change password
export function useUpdatePassword() {
  return useMutation({
    mutationFn: (data) => api.put("/auth/password", data),
    onSuccess: () => {
      toast.success("Password changed successfully");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to change password");
    },
  });
}