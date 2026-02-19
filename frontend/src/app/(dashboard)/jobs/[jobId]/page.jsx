"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
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
import { Trash2, BarChart3, MapPin, Clock } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function JobDetailPage() {
  const { jobId } = useParams();
  const router = useRouter();
  const [job, setJob] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [screeningId, setScreeningId] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [jobData, resumeData] = await Promise.all([
        api.get(`/jobs/${jobId}`),
        api.get(`/resumes/job/${jobId}`),
      ]);
      setJob(jobData.data?.job);
      setResumes(resumeData.data?.resumes || []);
    } catch {
      toast.error("Failed to load job details");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleScreen = async (resumeId) => {
    try {
      setScreeningId(resumeId);
      await api.post("/screening", { resumeId });
      toast.success("Resume screened successfully!");
      fetchData();
    } catch (err) {
      toast.error(err.message || "Screening failed");
    } finally {
      setScreeningId(null);
    }
  };

  const handleDeleteResume = async (resumeId) => {
    try {
      await api.delete(`/resumes/${resumeId}`);
      toast.success("Resume deleted");
      fetchData();
    } catch (err) {
      toast.error(err.message || "Delete failed");
    }
  };

  const handleDeleteJob = async () => {
    try {
      await api.delete(`/jobs/${jobId}`);
      toast.success("Job deleted");
      router.push("/jobs");
    } catch (err) {
      toast.error(err.message || "Delete failed");
    }
  };

  if (loading) return <LoadingSpinner />;
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
                <AlertDialogAction onClick={handleDeleteJob}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

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

      {/* Resume Upload */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Upload Resume</h2>
        <ResumeUpload jobId={jobId} onUploaded={fetchData} />
      </div>

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
                onScreen={handleScreen}
                onDelete={handleDeleteResume}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
