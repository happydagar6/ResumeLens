// src/components/dashboard/resume-upload.jsx
// ─────────────────────────────────────────────────────────────────────────────
// UPGRADED: True Bulk PDF Upload with:
//   - Parallel uploads (5 at a time, not one-by-one)
//   - Live progress counter ("Uploading 12 / 50…")
//   - A visual progress bar that fills as files complete
//   - File count limit (max 50) and file size limit (max 10MB per file)
//   - One-click "Upload & Screen All" button after all uploads complete
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_FILES = 50;          // Maximum number of files in one batch
const MAX_FILE_MB = 10;        // Maximum size of a single file in megabytes
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
const UPLOAD_CONCURRENCY = 5;  // How many files we upload in parallel at once

// ── Helper: Derive a human-readable name from the filename ────────────────────
// e.g. "john_doe_resume.pdf" → "John Doe"
function nameFromFilename(filename) {
  return filename
    .replace(/\.[^.]+$/, "")                          // remove extension
    .replace(/[-_]/g, " ")                            // dashes/underscores → spaces
    .replace(/\b(resume|cv|curriculum vitae)\b/gi, "") // remove common keywords
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());        // Title Case
}

// ── Status icons: shown next to each file in the queue ───────────────────────
const STATUS_ICONS = {
  pending:   <FileText className="h-4 w-4 text-muted-foreground" />,
  uploading: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
  done:      <CheckCircle2 className="h-4 w-4 text-green-500" />,
  error:     <AlertCircle className="h-4 w-4 text-destructive" />,
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// Props:
//   jobId     — MongoDB ID of the job these resumes belong to
//   onUploaded — callback to trigger after uploads complete (invalidates cache)
//   onScreenAll — optional callback to trigger bulk AI screening after upload
// ─────────────────────────────────────────────────────────────────────────────
export default function ResumeUpload({ jobId, onUploaded, onScreenAll }) {

  // queue: array of file items. Each item looks like:
  // { file: File, name: string, status: "pending"|"uploading"|"done"|"error", error: string|null }
  const [queue, setQueue] = useState([]);

  // isUploading: true while the uploadAll function is running
  const [isUploading, setIsUploading] = useState(false);

  // uploadedCount: how many files have finished uploading so far (for live counter + progress bar)
  const [uploadedCount, setUploadedCount] = useState(0);

  // allDone: true after uploadAll completes — triggers the "Screen All" prompt
  const [allDone, setAllDone] = useState(false);

  // ── Drop handler ─────────────────────────────────────────────────────────
  // Called by react-dropzone when the user drops or selects files
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {

    // Warn if any files were rejected by react-dropzone (wrong type, etc.)
    if (rejectedFiles.length > 0) {
      toast.error(`${rejectedFiles.length} file(s) rejected — only PDF files are accepted.`);
    }

    // Filter out files that exceed our custom size limit
    const oversized = acceptedFiles.filter((f) => f.size > MAX_FILE_BYTES);
    if (oversized.length > 0) {
      toast.error(`${oversized.length} file(s) exceed the ${MAX_FILE_MB}MB limit and were removed.`);
    }
    const validFiles = acceptedFiles.filter((f) => f.size <= MAX_FILE_BYTES);

    // Warn if the user is trying to upload too many files at once
    const currentCount = queue.length;
    const remainingSlots = MAX_FILES - currentCount;
    if (validFiles.length > remainingSlots) {
      toast.warning(`Only the first ${remainingSlots} of ${validFiles.length} files were added (max ${MAX_FILES}).`);
    }

    // Slice to respect the max file count, then map to queue items
    const filesToAdd = validFiles.slice(0, remainingSlots).map((file) => ({
      file,
      name: nameFromFilename(file.name), // derived candidate name
      status: "pending",
      error: null,
    }));

    if (filesToAdd.length > 0) {
      setQueue((prev) => [...prev, ...filesToAdd]);
      setAllDone(false); // reset the "done" state when new files are added
    }
  }, [queue]); // queue is a dependency because we check queue.length

  // ── react-dropzone config ─────────────────────────────────────────────────
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] }, // only PDFs
    multiple: true,                          // allow selecting multiple files at once
    maxFiles: MAX_FILES,                     // soft limit (we enforce it in onDrop too)
  });

  // ── Remove a single pending file from the queue ───────────────────────────
  function removePending(index) {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Update a single item in the queue by index ────────────────────────────
  // patch: partial object to merge, e.g. { status: "done" }
  function updateItem(index, patch) {
    setQueue((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  // ── Core Upload Function ──────────────────────────────────────────────────
  // Uploads all "pending" files in parallel batches of UPLOAD_CONCURRENCY (5).
  // This is the key upgrade from the old sequential (one-at-a-time) approach.
  async function uploadAll() {
    // Find the indexes of all files that are still in "pending" state
    const pendingIndexes = queue
      .map((item, i) => (item.status === "pending" ? i : null))
      .filter((i) => i !== null);

    if (pendingIndexes.length === 0) return;

    setIsUploading(true);
    setUploadedCount(0); // reset counter at start
    let successCount = 0;

    // ── Process in parallel batches of 5 ─────────────────────────────────
    // Example: 13 files → Batch 1: files 0-4, Batch 2: files 5-9, Batch 3: files 10-12
    for (let i = 0; i < pendingIndexes.length; i += UPLOAD_CONCURRENCY) {
      // Grab the next batch of up to 5 pending file indexes
      const batch = pendingIndexes.slice(i, i + UPLOAD_CONCURRENCY);

      // Mark all files in this batch as "uploading" immediately
      batch.forEach((idx) => updateItem(idx, { status: "uploading" }));

      // Upload all 5 files in THIS batch AT THE SAME TIME using Promise.allSettled.
      // allSettled means even if one fails, the others continue. We don't abort the batch.
      const results = await Promise.allSettled(
        batch.map(async (idx) => {
          const item = queue[idx];

          // Build the multipart form data (same format as the old uploader)
          const formData = new FormData();
          formData.append("resume", item.file);          // the actual PDF file
          formData.append("jobId", jobId);               // which job this belongs to
          formData.append("candidateName", item.name || item.file.name);

          // api.upload posts with Content-Type: multipart/form-data
          await api.upload("/resumes/upload", formData);
          return idx; // return the index so we know which one succeeded
        })
      );

      // After the batch finishes, update each file's status based on its result
      results.forEach((result, batchPos) => {
        const idx = batch[batchPos]; // get the original queue index

        if (result.status === "fulfilled") {
          // Upload succeeded ✅
          updateItem(idx, { status: "done" });
          successCount++;
          // Increment the live counter so the progress bar and "X / Y" text updates
          setUploadedCount((prev) => prev + 1);
        } else {
          // Upload failed ❌
          updateItem(idx, {
            status: "error",
            error: result.reason?.message || "Upload failed",
          });
          // Still increment the "processed" counter so the progress bar moves forward
          setUploadedCount((prev) => prev + 1);
        }
      });
    }

    // ── All batches done ──────────────────────────────────────────────────
    setIsUploading(false);

    if (successCount > 0) {
      toast.success(`${successCount} resume${successCount > 1 ? "s" : ""} uploaded!`);
      onUploaded?.(); // notify the parent (job page) to refresh the resumes list
      setAllDone(true); // show the "Screen All" prompt
    }

    const failCount = pendingIndexes.length - successCount;
    if (failCount > 0) {
      toast.error(`${failCount} upload${failCount > 1 ? "s" : ""} failed. Check the list below.`);
    }
  }

  // ── Computed values ───────────────────────────────────────────────────────
  // How many files are still waiting to be uploaded
  const pendingCount = queue.filter((i) => i.status === "pending").length;

  // Total files we are currently processing (for the progress bar denominator)
  const totalBeingUploaded = queue.filter(
    (i) => i.status === "uploading" || i.status === "done" || i.status === "error"
  ).length;

  // Progress percentage: from 0 to 100
  const progressPercent =
    totalBeingUploaded > 0
      ? Math.round((uploadedCount / (queue.filter((i) => i.status !== "pending").length || 1)) * 100)
      : 0;

  return (
    <div className="space-y-4">

      {/* ── Drop Zone ── */}
      {/* getRootProps attaches drag-and-drop events; isDragActive changes the style on hover */}
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
      >
        <input {...getInputProps()} />
        <div className="space-y-2">
          <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">
            {isDragActive ? "Drop PDFs here…" : "Drag & drop up to 50 PDFs, or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground">
            PDF only · Max {MAX_FILE_MB}MB per file · Up to {MAX_FILES} files at once
          </p>
        </div>
      </div>

      {/* ── File Queue (only shown when files are added) ── */}
      {queue.length > 0 && (
        <div className="space-y-3">

          {/* ── Live Upload Progress Bar (only visible while uploading) ── */}
          {isUploading && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                {/* Live counter: shows "Uploading 3 / 10…" */}
                <span>
                  Uploading {uploadedCount} / {queue.filter((i) => i.status !== "pending").length}…
                </span>
                <span>{progressPercent}%</span>
              </div>
              {/* Progress bar: the inner div width animates from 0% to 100% */}
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* ── Individual File Cards ── */}
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {/* max-h-64 + overflow-y-auto creates a scrollable list for 50 files */}
            {queue.map((item, idx) => (
              <Card key={idx} className="px-3 py-2">
                <div className="flex items-center gap-3">

                  {/* Status icon (spinner, check, error, or file icon) */}
                  {STATUS_ICONS[item.status]}

                  {/* File name + error message */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.file.name}</p>
                    {item.error && (
                      <p className="text-xs text-destructive">{item.error}</p>
                    )}
                  </div>

                  {/* Status badge: "pending", "uploading", "done", or "error" */}
                  <Badge
                    variant={
                      item.status === "done"
                        ? "secondary"
                        : item.status === "error"
                        ? "destructive"
                        : "outline"
                    }
                    className="shrink-0 capitalize text-xs"
                  >
                    {item.status}
                  </Badge>

                  {/* Remove button — only shown for pending files */}
                  {item.status === "pending" && !isUploading && (
                    <button
                      type="button"
                      onClick={() => removePending(idx)}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* ── Action Buttons ── */}
          <div className="flex items-center gap-3 flex-wrap">

            {/* PRIMARY: Upload button — disabled while uploading or if nothing is pending */}
            <Button
              onClick={uploadAll}
              disabled={isUploading || pendingCount === 0}
            >
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {/* Show the pending count in the button label for clarity */}
              {isUploading
                ? `Uploading ${uploadedCount} / ${queue.filter((i) => i.status !== "pending").length}…`
                : `Upload ${pendingCount > 0 ? `(${pendingCount})` : "All"}`
              }
            </Button>

            {/* SECONDARY: Screen All — only appears AFTER all uploads are done */}
            {/* This calls the onScreenAll prop which triggers the bulk AI screening */}
            {allDone && onScreenAll && (
              <Button
                variant="outline"
                onClick={() => {
                  onScreenAll(); // trigger the bulk screening in the parent
                  setAllDone(false); // hide this button after clicking
                }}
              >
                <Zap className="mr-2 h-4 w-4" />
                Screen All with AI
              </Button>
            )}

            {/* TERTIARY: Clear All — only when not uploading */}
            {!isUploading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQueue([]);
                  setAllDone(false);
                  setUploadedCount(0);
                }}
              >
                Clear All
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
