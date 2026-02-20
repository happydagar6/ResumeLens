import { create } from "zustand";

export const useUIStore = create((set) => ({
  // Mobile sidebar open/closed
  sidebarOpen: false,

  // Which jobId currently has the upload panel open (null = none)
  uploadPanelOpenForJob: null,

  actions: {
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    setUploadPanel: (jobId) => set({ uploadPanelOpenForJob: jobId }),
  },
}));