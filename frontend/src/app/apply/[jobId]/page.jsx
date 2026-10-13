"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { API_URL } from "@/lib/constants";
import { toast } from "sonner";
import { 
  Building2, MapPin, Briefcase, DollarSign, Upload, 
  FileText, X, Loader2, AlertCircle 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function PublicJobApplyPage() {
  const { jobId } = useParams();
  const router = useRouter();

  // Job details state
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [jobError, setJobError] = useState("");

  // Consolidated Form State (Clean single object instead of multiple useStates)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  // 1. Fetch public job details
  useEffect(() => {
    if (!jobId) return;

    async function fetchJob() {
      try {
        const res = await fetch(`${API_URL}/public/jobs/${jobId}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to load job details.");
        }

        setJob(data.data.job);
      } catch (err) {
        setJobError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchJob();
  }, [jobId]);

  // 2. Dropzone for PDF Resume
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB limit
    onDrop: (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors[0]?.code === "file-too-large") {
          toast.error("File is too large. Maximum size is 5MB.");
        } else {
          toast.error("Invalid file format. Please upload a PDF.");
        }
        return;
      }
      if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0]);
      }
    },
  });

  // 3. Handle Application Submit
  async function handleSubmit(e) {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error("Please provide both your name and email.");
      return;
    }

    if (!file) {
      toast.error("Please upload your resume in PDF format.");
      return;
    }

    setSubmitting(true);

    try {
      const dataPayload = new FormData();
      dataPayload.append("candidateName", formData.name.trim());
      dataPayload.append("candidateEmail", formData.email.trim());
      dataPayload.append("candidatePhone", formData.phone.trim());
      dataPayload.append("resume", file);

      const res = await fetch(`${API_URL}/public/apply/${jobId}`, {
        method: "POST",
        body: dataPayload,
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || "Failed to submit application.");
      }

      toast.success("Application submitted successfully!");
      // Redirect to real-time status tracker
      router.push(`/status/${result.data.resumeId}`);
    } catch (err) {
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // --- Loading State ---
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Loading job details...</p>
      </div>
    );
  }

  // --- Closed or Error State ---
  if (jobError || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
        <Card className="max-w-md w-full text-center p-6 shadow-sm">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <CardTitle className="text-xl">Position Unavailable</CardTitle>
          <CardDescription className="mt-2 text-sm">
            {jobError || "This job is no longer accepting applications."}
          </CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Job Header & Details Card */}
        <Card className="shadow-sm border">
          <CardHeader className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold tracking-wider text-primary uppercase">
                  {job.company}
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
                  {job.title}
                </h1>
              </div>
              <Badge variant="secondary" className="w-fit text-xs px-3 py-1 capitalize">
                {job.type}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground pt-2">
              {job.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  <span>{job.location}</span>
                </div>
              )}
              {job.salaryRange && (
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4" />
                  <span>{job.salaryRange}</span>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <Separator />

            {/* Description */}
            <div>
              <h2 className="text-base font-semibold mb-2">About the Role</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {job.description}
              </p>
            </div>

            {/* Requirements */}
            {job.requirements && (
              <div>
                <h2 className="text-base font-semibold mb-2">Requirements & Qualifications</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {job.requirements}
                </p>
              </div>
            )}

            {/* Required Skills */}
            {job.skills && job.skills.length > 0 && (
              <div>
                <h2 className="text-base font-semibold mb-2">Required Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Candidate Application Form */}
        <Card className="shadow-sm border">
          <CardHeader>
            <CardTitle className="text-xl">Apply for this Position</CardTitle>
            <CardDescription>
              Submit your resume below. Our AI screening pipeline will review your background and provide real-time updates.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
                  <Input 
                    id="name"
                    name="name"
                    placeholder="Jane Doe"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address <span className="text-destructive">*</span></Label>
                  <Input 
                    id="email"
                    name="email"
                    type="email"
                    placeholder="jane@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input 
                  id="phone"
                  name="phone"
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              {/* PDF Dropzone */}
              <div className="space-y-2">
                <Label>Resume (PDF only, max 5MB) <span className="text-destructive">*</span></Label>
                
                {!file ? (
                  <div 
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      isDragActive 
                        ? "border-primary bg-primary/5" 
                        : "border-muted-foreground/25 hover:border-primary/50"
                    }`}
                  >
                    <input {...getInputProps()} />
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium">
                      Drag & drop your resume here, or <span className="text-primary underline">browse</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Supports PDF up to 5MB</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/40">
                    <div className="flex items-center gap-3">
                      <FileText className="h-6 w-6 text-primary shrink-0" />
                      <div className="truncate">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="icon"
                      onClick={() => setFile(null)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full text-base py-6"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Submitting Application...
                  </>
                ) : (
                  "Submit Application"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
