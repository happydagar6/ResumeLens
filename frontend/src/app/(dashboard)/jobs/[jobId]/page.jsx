"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useJob, useDeleteJob, useAssignHiringManager } from "@/hooks/use-jobs";
import { useResumesByJob, useDeleteResume } from "@/hooks/use-resume";
import { useRunScreening } from "@/hooks/use-screening";
import { RESUME_KEYS } from "@/hooks/use-resume";
import { usePermissions } from "@/hooks/use-permissions";
import { useHiringManagers } from "@/hooks/use-users";
import ResumeUpload from "@/components/dashboard/resume-upload";
import ResumeCard from "@/components/dashboard/resume-card";
import { LoadingSpinner } from "@/components/common/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, BarChart3, MapPin, Clock, Pencil, UserPlus, X, Users } from "lucide-react";
import Link from "next/link";

export default function JobDetailPage() {
  const { jobId } = useParams();
  const queryClient = useQueryClient();

  // Permissions must come first — used to conditionally enable queries below
  const { canEditJob, canDeleteJob, canUploadResume, canRunScreening, canAssignHiringManager } = usePermissions();

  // State
  const [showAssignPanel, setShowAssignPanel] = useState(false);

  // Data fetching
  const { job, isLoading: jobLoading } = useJob(jobId);
  const { resumes, isLoading: resumesLoading } = useResumesByJob(jobId);
  // Only fetch HM list when recruiter/admin (hiring managers cannot assign)
  const { hiringManagers } = useHiringManagers({ enabled: canAssignHiringManager });

  // Mutations
  const deleteJobMutation = useDeleteJob();
  const deleteResumeMutation = useDeleteResume(jobId);
  const screenMutation = useRunScreening();
  const assignHMMutation = useAssignHiringManager(jobId);

  const isLoading = jobLoading || resumesLoading;

  if (isLoading) return <LoadingSpinner />;
  if (!job) return <p className="text-muted-foreground">Job not found.</p>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{job.title}</h1>
            <Badge>{job.status}</Badge>
          </div>
          <p className="text-muted-foreground">{job.company}</p>
          <div className="flex gap-4 text-sm text-muted-foreground mt-1">
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {job.location}
              </span>
            )}
            {job.type && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {job.type}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/jobs/${jobId}/screening`}>
              <BarChart3 className="mr-2 h-4 w-4" />
              Screening Results
            </Link>
          </Button>
          {canEditJob && (
            <Button variant="outline" asChild>
              <Link href={`/jobs/${jobId}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}
          {canAssignHiringManager && (
            <Button variant="outline" onClick={() => setShowAssignPanel((v) => !v)}>
              <Users className="mr-2 h-4 w-4" />
              Assign HM
            </Button>
          )}
          {canDeleteJob && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Job?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this job posting. This action cannot be
                    undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteJobMutation.mutate(jobId)}
                    disabled={deleteJobMutation.isPending}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Assigned Hiring Managers */}
      {job.assignedTo?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center">Assigned HMs:</span>
          {job.assignedTo.map((hm) => (
            <Badge key={hm._id} variant="secondary" className="gap-1">
              <UserPlus className="h-3 w-3" />
              {hm.name}
              {canAssignHiringManager && (
                <button
                  className="ml-1 hover:text-destructive"
                  onClick={() => assignHMMutation.mutate({ userId: hm._id, action: "remove" })}
                  aria-label={`Remove ${hm.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Assign Hiring Manager Panel */}
      {canAssignHiringManager && showAssignPanel && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <h3 className="text-sm font-semibold">Assign Hiring Manager</h3>
          {hiringManagers.length === 0 ? (
            <p className="text-xs text-muted-foreground">No hiring manager accounts found.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {hiringManagers
                .filter((hm) => !job.assignedTo?.some((a) => a._id === hm._id))
                .map((hm) => (
                  <Button
                    key={hm._id}
                    variant="outline"
                    size="sm"
                    disabled={assignHMMutation.isPending}
                    onClick={() => {
                      assignHMMutation.mutate({ userId: hm._id, action: "add" });
                      setShowAssignPanel(false);
                    }}
                  >
                    <UserPlus className="mr-1 h-3 w-3" />
                    {hm.name}
                  </Button>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Description */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Description</h2>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {job.description}
        </p>
      </div>

      {job.requirements && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Requirements</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {job.requirements}
          </p>
        </div>
      )}

      {job.skills?.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {job.skills.map((skill) => (
              <Badge key={skill} variant="secondary">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Resume Upload â€” onUploaded invalidates the resumes cache directly */}
      {canUploadResume && (
        <>
          <Separator />
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Upload Resume</h2>
            <ResumeUpload
              jobId={jobId}
              onUploaded={() =>
                queryClient.invalidateQueries({ queryKey: RESUME_KEYS.byJob(jobId) })
              }
            />
          </div>
        </>
      )}

      <Separator />

      {/* Resumes List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          Uploaded Resumes ({resumes.length})
        </h2>
        {resumes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No resumes uploaded yet. Upload a PDF resume above.
          </p>
        ) : (
          <div className="space-y-3">
            {resumes.map((resume) => (
              <ResumeCard
                key={resume._id}
                resume={resume}
                // Per-resume loading state: only show spinner on the resume being screened
                screening={
                  screenMutation.isPending &&
                  screenMutation.variables?.resumeId === resume._id
                }
                onScreen={
                  canRunScreening
                    ? (resumeId) => screenMutation.mutate({ resumeId, jobId })
                    : undefined
                }
                onDelete={
                  canDeleteJob
                    ? (resumeId) => deleteResumeMutation.mutate(resumeId)
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
