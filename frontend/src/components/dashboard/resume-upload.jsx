"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resumeUploadSchema } from "@/lib/validators";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ResumeUpload({ jobId, onUploaded }) {
  const [file, setFile] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resumeUploadSchema),
    defaultValues: { candidateName: "", candidateEmail: "" },
  });

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    multiple: false,
  });

  const onSubmit = async (data) => {
    if (!file) {
      toast.error("Please select a PDF file");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("jobId", jobId);
      formData.append("candidateName", data.candidateName);
      if (data.candidateEmail) formData.append("candidateEmail", data.candidateEmail);

      await api.upload("/resumes/upload", formData);
      toast.success("Resume uploaded successfully!");
      reset();
      setFile(null);
      onUploaded?.();
    } catch (err) {
      toast.error(err.message || "Upload failed");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
      >
        <input {...getInputProps()} />
        {file ? (
          <div className="flex items-center justify-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">{file.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drag & drop a PDF resume here, or click to browse
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="candidateName">Candidate Name *</Label>
          <Input
            id="candidateName"
            placeholder="John Doe"
            {...register("candidateName")}
          />
          {errors.candidateName && (
            <p className="text-xs text-destructive">{errors.candidateName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="candidateEmail">Email (Optional)</Label>
          <Input
            id="candidateEmail"
            type="email"
            placeholder="john@example.com"
            {...register("candidateEmail")}
          />
          {errors.candidateEmail && (
            <p className="text-xs text-destructive">{errors.candidateEmail.message}</p>
          )}
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting || !file}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Upload Resume
      </Button>
    </form>
  );
}
