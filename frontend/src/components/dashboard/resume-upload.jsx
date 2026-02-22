"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

// Derive a candidate name from a filename like "john_doe_resume.pdf" → "John Doe"
function nameFromFilename(filename) {
  return filename
    .replace(/\.[^.]+$/, "")                    // remove extension
    .replace(/[-_]/g, " ")                      // dashes/underscores → spaces
    .replace(/\b(resume|cv|curriculum vitae)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());  // Title Case
}

const STATUS_ICONS = {
  pending:    <FileText className="h-4 w-4 text-muted-foreground" />,
  uploading:  <Loader2 className="h-4 w-4 animate-spin text-primary" />,
  done:       <CheckCircle2 className="h-4 w-4 text-green-500" />,
  error:      <AlertCircle className="h-4 w-4 text-destructive" />,
};

export default function ResumeUpload({ jobId, onUploaded }) {
  // queue: [{ file, name, status: "pending"|"uploading"|"done"|"error", error? }]
  const [queue, setQueue] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles) => {
    const newItems = acceptedFiles.map((file) => ({
      file,
      name: nameFromFilename(file.name),
      status: "pending",
      error: null,
    }));
    setQueue((prev) => [...prev, ...newItems]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: true,
  });

  function removePending(index) {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(index, patch) {
    setQueue((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  async function uploadAll() {
    const pendingIndexes = queue
      .map((item, i) => (item.status === "pending" ? i : null))
      .filter((i) => i !== null);

    if (pendingIndexes.length === 0) return;

    setIsUploading(true);
    let successCount = 0;

    for (const idx of pendingIndexes) {
      const item = queue[idx];
      updateItem(idx, { status: "uploading" });

      try {
        const formData = new FormData();
        formData.append("resume", item.file);
        formData.append("jobId", jobId);
        formData.append("candidateName", item.name || item.file.name);

        await api.upload("/resumes/upload", formData);
        updateItem(idx, { status: "done" });
        successCount++;
      } catch (err) {
        updateItem(idx, { status: "error", error: err.message || "Upload failed" });
      }
    }

    setIsUploading(false);

    if (successCount > 0) {
      toast.success(`${successCount} resume${successCount > 1 ? "s" : ""} uploaded!`);
      onUploaded?.();
    }

    const failCount = pendingIndexes.length - successCount;
    if (failCount > 0) toast.error(`${failCount} upload${failCount > 1 ? "s" : ""} failed`);
  }

  const pendingCount = queue.filter((i) => i.status === "pending").length;

  return (
    <div className="space-y-4">
      {/* Drop zone */}
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
            {isDragActive ? "Drop PDFs here…" : "Drag & drop PDFs, or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground">
            Multiple files supported · PDF only
          </p>
        </div>
      </div>

      {/* File queue */}
      {queue.length > 0 && (
        <div className="space-y-2">
          {queue.map((item, idx) => (
            <Card key={idx} className="px-3 py-2">
              <div className="flex items-center gap-3">
                {STATUS_ICONS[item.status]}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.file.name}</p>
                  {item.error && (
                    <p className="text-xs text-destructive">{item.error}</p>
                  )}
                </div>
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
                {item.status === "pending" && (
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

          <div className="flex items-center gap-3">
            <Button
              onClick={uploadAll}
              disabled={isUploading || pendingCount === 0}
            >
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upload {pendingCount > 0 ? `(${pendingCount})` : "All"}
            </Button>
            {!isUploading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQueue([])}
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