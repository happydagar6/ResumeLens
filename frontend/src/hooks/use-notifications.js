import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

const NOTIFICATION_KEYS = {
  all: ["notifications"],
};

// GET /api/notifications — polls every 30 s
export function useNotifications() {
  const { data, isLoading } = useQuery({
    queryKey: NOTIFICATION_KEYS.all,
    queryFn: () => api.get("/notifications"),
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });

  return {
    notifications: data?.data?.notifications ?? [],
    unreadCount: data?.data?.unreadCount ?? 0,
    isLoading,
  };
}

// PATCH /api/notifications/read-all
export function useMarkAllRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.patch("/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
    },
  });
}

// PATCH /api/notifications/:id/read
export function useMarkOneRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
    },
  });
}

// DELETE /api/notifications
export function useClearNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.delete("/notifications"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
    },
  });
}
