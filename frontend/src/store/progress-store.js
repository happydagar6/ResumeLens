import { create } from "zustand";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

// Concurrency limit for uploads
const UPLOAD_CONCURRENCY = 5;

// ── Global Progress Store ───────────────────────────────────────────────────
// Manages the state for long-running background tasks (uploads, AI screenings)
// so that progress isn't lost when components unmount due to page navigation.

export const useProgressStore = create((set, get) => ({
  // ── Upload State ──
  queue: [],           // Array of file items { file, name, status, error }
  isUploading: false,
  uploadedCount: 0,
  allDone: false,

  // ── Screening State ──
  activeScreenings: [], // Array of resumeIds currently being screened

  // ── Actions: Uploading ──
  setQueue: (updater) => set((state) => ({ 
    queue: typeof updater === "function" ? updater(state.queue) : updater 
  })),
  
  setAllDone: (done) => set({ allDone: done }),
  
  removePending: (index) => set((state) => ({
    queue: state.queue.filter((_, i) => i !== index)
  })),

  updateItem: (index, patch) => set((state) => ({
    queue: state.queue.map((item, i) => (i === index ? { ...item, ...patch } : item))
  })),

  uploadAll: async (jobId, onUploaded) => {
    const { queue, updateItem } = get();

    const pendingIndexes = queue
      .map((item, i) => (item.status === "pending" ? i : null))
      .filter((i) => i !== null);

    if (pendingIndexes.length === 0) return;

    set({ isUploading: true, uploadedCount: 0 });
    let successCount = 0;

    for (let i = 0; i < pendingIndexes.length; i += UPLOAD_CONCURRENCY) {
      const batch = pendingIndexes.slice(i, i + UPLOAD_CONCURRENCY);

      // Mark as uploading
      batch.forEach((idx) => updateItem(idx, { status: "uploading" }));

      const results = await Promise.allSettled(
        batch.map(async (idx) => {
          // get the latest queue state in case it changed
          const item = get().queue[idx]; 
          const formData = new FormData();
          formData.append("resume", item.file);
          formData.append("jobId", jobId);
          formData.append("candidateName", item.name || item.file.name);

          await api.upload("/resumes/upload", formData);
          return idx;
        })
      );

      results.forEach((result, batchPos) => {
        const idx = batch[batchPos];

        if (result.status === "fulfilled") {
          updateItem(idx, { status: "done" });
          successCount++;
          set((state) => ({ uploadedCount: state.uploadedCount + 1 }));
        } else {
          updateItem(idx, {
            status: "error",
            error: result.reason?.message || "Upload failed",
          });
          set((state) => ({ uploadedCount: state.uploadedCount + 1 }));
        }
      });
    }

    set({ isUploading: false });

    if (successCount > 0) {
      toast.success(`${successCount} resume${successCount > 1 ? "s" : ""} uploaded!`);
      onUploaded?.();
      set({ allDone: true });
    }

    const failCount = pendingIndexes.length - successCount;
    if (failCount > 0) {
      toast.error(`${failCount} upload${failCount > 1 ? "s" : ""} failed. Check the list below.`);
    }
  },

  // ── Actions: Screening ──
  addActiveScreening: (resumeId) => set((state) => ({
    activeScreenings: [...new Set([...state.activeScreenings, resumeId])]
  })),

  removeActiveScreening: (resumeId) => set((state) => ({
    activeScreenings: state.activeScreenings.filter(id => id !== resumeId)
  })),
}));
