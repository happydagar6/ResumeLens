"use client";

import { create } from "zustand";
import { api } from "@/lib/api-client";

export const useAuth = create((set) => ({
  user: null,
  loading: true,

  checkAuth: async () => {
    try {
      const data = await api.get("/auth/me");
      set({ user: data.data.user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },

  login: async (credentials) => {
    const data = await api.post("/auth/login", credentials);
    set({ user: data.data.user });
    return data;
  },

  signup: async (userData) => {
    const data = await api.post("/auth/signup", userData);
    set({ user: data.data.user });
    return data;
  },

  logout: async () => {
    await api.post("/auth/logout");
    set({ user: null });
  },
}));
