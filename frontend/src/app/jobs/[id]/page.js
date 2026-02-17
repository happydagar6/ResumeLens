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
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-3">
                    <Link href="/" className="text-xl font-bold text-foreground tracking-tight">
                        Recruit<span className="text-primary">AI</span>
                    </Link>
                    <span className="text-border">/</span>
                    <Link href="/jobs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Jobs</Link>
                    <span className="text-border">/</span>
                    <span className="text-sm text-foreground font-medium truncate">{job?.title}</span>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                {error && (
                    <div className="bg-error-light border border-error/20 text-error text-sm rounded-lg p-3 mb-6">
                        {error}
                    </div>
                )}

                {/* Job Info Card */}
                <div className="bg-card border border-border rounded-xl p-6 mb-8 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-2xl font-bold text-foreground">{job?.title}</h1>
                                <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                                    job?.status === "open" ? "bg-success-light text-success" : "bg-secondary text-muted-foreground"
                                }`}>
                                    {job?.status}
                                </span>
                            </div>
                            <p className="text-muted-foreground text-sm">
                                {job?.company} • {job?.location || "Remote"} • {job?.type}
                                {job?.salaryRange && ` • ${job.salaryRange}`}
                            </p>
                            {job?.skills?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-3">
                                    {job.skills.map((skill, i) => (
                                        <span key={i} className="text-xs bg-primary-light text-primary px-2.5 py-0.5 rounded-md font-medium">{skill}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    {job?.description && (
                        <div className="mt-5 pt-5 border-t border-border">
                            <h3 className="text-sm font-medium text-foreground mb-2">Description</h3>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{job.description}</p>
                        </div>
                    )}
                </div>

                {/* Candidates Section */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-bold text-foreground">Candidates</h2>
                            <p className="text-sm text-muted-foreground mt-0.5">{resumes.length} resume{resumes.length !== 1 ? "s" : ""} uploaded</p>
                        </div>
                        <label className="inline-flex items-center h-10 px-5 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary-hover transition-colors cursor-pointer shadow-sm">
                            {uploading ? "Uploading..." : "📄 Upload Resume"}
                            <input type="file" accept=".pdf" onChange={handleUpload} className="hidden" disabled={uploading} />
                        </label>
                    </div>

                    {resumes.length === 0 ? (
                        <div className="bg-card border border-border rounded-xl p-10 text-center shadow-sm">
                            <div className="text-4xl mb-3">📄</div>
                            <p className="text-foreground font-medium mb-1">No resumes yet</p>
                            <p className="text-sm text-muted-foreground">Upload a PDF resume to start screening candidates</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {resumes.map((resume) => {
                                const screening = screenings.find(s => s.resumeId?._id === resume._id || s.resumeId === resume._id);
                                return (
                                    <div key={resume._id} className="bg-card border border-border rounded-xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-primary-light rounded-lg flex items-center justify-center text-primary font-bold text-sm">
                                                {resume.candidateName?.charAt(0)?.toUpperCase() || "?"}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-foreground">{resume.candidateName}</h3>
                                                <p className="text-xs text-muted-foreground">{resume.fileName} • {resume.status}</p>
                                            </div>
                                        </div>
                                        <div>
                                            {screening ? (
                                                <Link href={`/screening/${screening._id}`}
                                                    className="inline-flex items-center text-sm bg-success-light text-success px-3 py-1.5 rounded-lg font-medium hover:shadow-sm transition-shadow">
                                                    Score: {screening.overallScore}% →
                                                </Link>
                                            ) : (
                                                <span className="text-xs text-muted-foreground bg-secondary px-3 py-1.5 rounded-lg">Not screened</span>
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
