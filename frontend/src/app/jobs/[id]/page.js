"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { jobsAPI, resumesAPI, screeningAPI } from "@/lib/api";

export default function JobDetailPage() {
    const params = useParams();
    const [job, setJob] = useState(null);
    const [resumes, setResumes] = useState([]);
    const [screenings, setScreenings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (params.id) {
            Promise.all([
                jobsAPI.getById(params.id),
                resumesAPI.getByJob(params.id),
                screeningAPI.getByJob(params.id).catch(() => ({ data: { screenings: [] } })),
            ]).then(([jobData, resumeData, screeningData]) => {
                setJob(jobData.data.job);
                setResumes(resumeData.data.resumes || []);
                setScreenings(screeningData.data.screenings || []);
            }).catch(() => {
                setError("Failed to load job details");
            }).finally(() => setLoading(false));
        }
    }, [params.id]);

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const candidateName = prompt("Enter candidate name:");
        if (!candidateName) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("resume", file);
            formData.append("jobId", params.id);
            formData.append("candidateName", candidateName);
            const data = await resumesAPI.upload(formData);
            setResumes([data.data.resume, ...resumes]);
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-4">
                    <Link href="/" className="text-xl font-bold text-foreground">
                        Recruit<span className="text-primary">AI</span>
                    </Link>
                    <span className="text-muted-foreground">/</span>
                    <Link href="/jobs" className="text-sm text-muted-foreground hover:text-foreground">Jobs</Link>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-sm text-foreground">{job?.title}</span>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                {error && <div className="bg-error/10 border border-error/20 text-error text-sm rounded-lg p-3 mb-6">{error}</div>}

                {/* Job Header */}
                <div className="bg-card border border-border rounded-2xl p-6 mb-8">
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">{job?.title}</h1>
                            <p className="text-muted-foreground mt-1">{job?.company} • {job?.location || "Remote"} • {job?.type}</p>
                            {job?.skills?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-3">
                                    {job.skills.map((skill, i) => (
                                        <span key={i} className="text-xs bg-primary/10 text-accent px-2 py-0.5 rounded-md">{skill}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                        <span className={`text-xs font-medium px-3 py-1 rounded-full ${job?.status === "open" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                            {job?.status}
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-4 whitespace-pre-wrap">{job?.description}</p>
                </div>

                {/* Resumes Section */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-foreground">Candidates ({resumes.length})</h2>
                        <label className="inline-flex items-center h-10 px-5 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary-hover transition-colors cursor-pointer">
                            {uploading ? "Uploading..." : "📄 Upload Resume"}
                            <input type="file" accept=".pdf" onChange={handleUpload} className="hidden" disabled={uploading} />
                        </label>
                    </div>

                    {resumes.length === 0 ? (
                        <div className="bg-card border border-border rounded-xl p-8 text-center">
                            <p className="text-muted-foreground">No resumes uploaded yet. Upload a PDF to get started!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {resumes.map((resume) => {
                                const screening = screenings.find(s => s.resumeId?._id === resume._id || s.resumeId === resume._id);
                                return (
                                    <div key={resume._id} className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
                                        <div>
                                            <h3 className="font-semibold text-foreground">{resume.candidateName}</h3>
                                            <p className="text-sm text-muted-foreground">{resume.fileName} • {resume.status}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {screening ? (
                                                <Link href={`/screening/${screening._id}`}
                                                    className="text-sm bg-success/10 text-success px-3 py-1 rounded-full font-medium">
                                                    Score: {screening.overallScore}%
                                                </Link>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">Not screened</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
