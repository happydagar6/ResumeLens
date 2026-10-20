import { create } from "zustand";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

// Concurrency limit for uploads
const UPLOAD_CONCURRENCY = 5;
let uploadAbortController = null; // Holds the active AbortController for in-flight files
let isUploadCancelled = false;    // Persistent flag to prevent false-alarm fail toasts

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
  setUploadedCount: (count) => set({ uploadedCount: count }),
  
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
    isUploadCancelled = false; // Reset cancellation flag
    uploadAbortController = new AbortController(); // Create fresh controller

    for (let i = 0; i < pendingIndexes.length; i += UPLOAD_CONCURRENCY) {
      // Check if user clicked cancel button between batches
      if (isUploadCancelled || uploadAbortController?.signal?.aborted) {
        break;
      }

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

          await api.upload("/resumes/upload", formData, {
            signal: uploadAbortController?.signal,
          });
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
          const isAborted = isUploadCancelled || result.reason?.name === "AbortError" || uploadAbortController?.signal?.aborted;
          updateItem(idx, {
            status: isAborted ? "pending" : "error",
            error: isAborted ? null : (result.reason?.message || "Upload failed"),
          });
          if (!isAborted) {
            set((state) => ({ uploadedCount: state.uploadedCount + 1 }));
          }
        }
      });
    }

    uploadAbortController = null;
    set({ isUploading: false });

    if (successCount > 0) {
      toast.success(`${successCount} resume${successCount > 1 ? "s" : ""} uploaded!`);
      onUploaded?.();
      set({ allDone: true });
    }

    const failCount = pendingIndexes.length - successCount;
    if (failCount > 0 && !isUploadCancelled) {
      toast.error(`${failCount} upload${failCount > 1 ? "s" : ""} failed. Check the list below.`);
    }
  },

  // Action: Cancel active upload
  cancelUpload: () => {
    isUploadCancelled = true;
    // Abort in-flight network request
    if (uploadAbortController) {
      uploadAbortController.abort();
      uploadAbortController = null;
    }

    set((state) => ({
      isUploading: false,
      queue: state.queue.map((item) =>
        item.status === "uploading" || item.error === "Upload aborted" || item.error?.includes("abort")
          ? { ...item, status: "pending", error: null }
          : item
      ),
    }));
    toast.info("Upload stopped by user.");
  },

  // ── Actions: Screening ──
  addActiveScreening: (resumeId) => set((state) => ({
    activeScreenings: [...new Set([...state.activeScreenings, resumeId])]
  })),

  removeActiveScreening: (resumeId) => set((state) => ({
    activeScreenings: state.activeScreenings.filter(id => id !== resumeId)
  })),
  
}));
