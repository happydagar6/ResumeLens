import { create } from "zustand";

// ── Global UI Layout Store ───────────────────────────────────────────────────
// Built with Zustand to manage transient UI states (drawers, sidebars, modals)
// across components without prop drilling.

export const useUIStore = create((set) => ({
  // State 1: Boolean controlling whether mobile responsive navigation sidebar is open (true) or closed (false)
  sidebarOpen: false,

  // State 2: Stores the jobId of the job whose PDF upload drawer is currently active (null = no panel open)
  uploadPanelOpenForJob: null,

  // Grouped Actions (Setters): Functions to mutate the UI state
  actions: {
    // Toggles mobile sidebar boolean state (inverts true <-> false when hamburger icon is clicked)
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

    // Explicitly sets mobile sidebar open state to true or false (e.g. when user clicks outside drawer)
    setSidebarOpen: (open) => set({ sidebarOpen: open }),

    // Sets active upload panel job ID to open drawer for specific job (or passes null to close drawer)
    setUploadPanel: (jobId) => set({ uploadPanelOpenForJob: jobId }),
  },
}));