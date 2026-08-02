"use client";

import { create } from "zustand";
import { api } from "@/lib/api-client";

export const useAuth = create((set) => ({
  user: null, // null initially
  loading: true, // loading initially

  checkAuth: async () => {
    try {
      const data = await api.get("/auth/me"); // get current user
      set({ user: data.data.user, loading: false }); // set current user
    } catch {
      set({ user: null, loading: false }); // set current user to null
    }
  },

  login: async (credentials) => {
    const data = await api.post("/auth/login", credentials); // login request
    set({ user: data.data.user }); // set current user
    return data; // return response data
  },

  signup: async (userData) => {
    const data = await api.post("/auth/signup", userData); // signup request
    set({ user: data.data.user }); // set current user
    return data; // return response data
  },

  logout: async () => {
    await api.post("/auth/logout"); // 
    set({ user: null });
  },
}));
