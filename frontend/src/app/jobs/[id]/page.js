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
    const [screening, setScreeningInProgress] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        if (params.id) {
            Promise.all([
                jobsAPI.getById(params.id),
                resumesAPI.getByJob(params.id),
                screeningAPI
                    .getByJob(params.id)
                    .catch(() => ({ data: { screenings: [] } })),
            ])
                .then(([jobData, resumeData, screeningData]) => {
                    setJob(jobData.data.job);
                    setResumes(resumeData.data.resumes || []);
                    setScreenings(screeningData.data.screenings || []);
                })
                .catch(() => {
                    setError("Failed to load job details");
                })
                .finally(() => setLoading(false));
        }
    }, [params.id]);

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const candidateName = prompt("Enter candidate name:");
        if (!candidateName) return;

        setUploading(true);
        setError("");
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
            e.target.value = "";
        }
    };

    const handleScreen = async (resumeId) => {
        setScreeningInProgress(resumeId);
        setError("");
        try {
            const data = await screeningAPI.screen({ resumeId });
            setScreenings([...screenings, data.data.screening]);
        } catch (err) {
            setError(`Screening failed: ${err.message}`);
        } finally {
            setScreeningInProgress(null);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="text-center">
                    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-muted-foreground text-sm">Loading job details...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="bg-white border-b border-border/60 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-3">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">R</span>
                        </div>
                        <span className="text-lg font-bold text-foreground tracking-tight">
                            Recruit<span className="text-primary">AI</span>
                        </span>
                    </Link>
                    <span className="text-border text-lg">
                        /
                    </span>
                    <Link
                        href="/jobs"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
                    >
                        Jobs
                    </Link>
                    <span className="text-border text-lg">
                        /
                    </span>
                    <span className="text-sm text-foreground font-semibold truncate">
                        {job?.title}
                    </span>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                {error && (
                    <div className="bg-error-light border border-error/20 text-error text-sm font-medium rounded-xl p-4 mb-6">
                        {error}
                    </div>
                )}

                {/* Job Info Card */}
                <div className="bg-white border border-border/60 rounded-2xl p-7 mb-8 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0">
                                    {job?.title?.charAt(0)?.toUpperCase() || "J"}
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-foreground">
                                        {job?.title}
                                    </h1>
                                    <p className="text-muted-foreground text-sm mt-0.5">
                                        {job?.company} •{" "}
                                        {job?.location || "Remote"} •{" "}
                                        {job?.type}
                                        {job?.salaryRange &&
                                            ` • ${job.salaryRange}`}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                                <span
                                    className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                                        job?.status === "open"
                                            ? "bg-success-light text-success"
                                            : "bg-secondary text-muted-foreground"
                                    }`}
                                >
                                    {job?.status}
                                </span>
                                {job?.skills?.length > 0 &&
                                    job.skills.map((skill, i) => (
                                        <span
                                            key={i}
                                            className="text-xs bg-primary-light text-primary px-2.5 py-1 rounded-lg font-semibold"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                            </div>
                        </div>
                    </div>
                    {job?.description && (
                        <div className="mt-6 pt-6 border-t border-border/60">
                            <h3 className="text-sm font-bold text-foreground mb-2">
                                Description
                            </h3>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                {job.description}
                            </p>
                        </div>
                    )}
                </div>

                {/* Candidates Section */}
                <div>
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h2 className="text-xl font-bold text-foreground">
                                Candidates
                            </h2>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                {resumes.length} resume
                                {resumes.length !== 1 ? "s" : ""} uploaded
                            </p>
                        </div>
                        <label
                            className={`inline-flex items-center gap-2 h-11 px-6 rounded-xl font-semibold text-sm transition-all cursor-pointer shadow-sm hover:shadow-md ${
                                uploading
                                    ? "bg-muted text-muted-foreground cursor-wait"
                                    : "bg-primary text-white hover:bg-primary-hover"
                            }`}
                        >
                            {uploading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Uploading...
                                </>
                            ) : (
                                <>📄 Upload Resume</>
                            )}
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleUpload}
                                className="hidden"
                                disabled={uploading}
                            />
                        </label>
                    </div>

                    {resumes.length === 0 ? (
                        <div className="bg-white border border-border/60 rounded-2xl p-12 text-center shadow-sm">
                            <div className="w-16 h-16 bg-primary-light rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                                📄
                            </div>
                            <p className="text-foreground font-bold text-lg mb-2">
                                No resumes yet
                            </p>
                            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                                Upload a PDF resume to start screening
                                candidates with AI
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {resumes.map((resume) => {
                                const scr = screenings.find(
                                    (s) =>
                                        s.resumeId?._id === resume._id ||
                                        s.resumeId === resume._id
                                );
                                const isScreening =
                                    screening === resume._id;
                                return (
                                    <div
                                        key={resume._id}
                                        className="bg-white border border-border/60 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 bg-primary-light rounded-xl flex items-center justify-center text-primary font-bold text-sm shrink-0">
                                                {resume.candidateName
                                                    ?.charAt(0)
                                                    ?.toUpperCase() || "?"}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-foreground">
                                                    {resume.candidateName}
                                                </h3>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {resume.fileName} •{" "}
                                                    <span
                                                        className={
                                                            resume.status ===
                                                            "parsed"
                                                                ? "text-success font-medium"
                                                                : "text-warning font-medium"
                                                        }
                                                    >
                                                        {resume.status}
                                                    </span>
                                                    {resume.extractedEntities && (
                                                        <span className="text-primary font-medium">
                                                            {" "}
                                                            • AI extracted
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 ml-4">
                                            {scr ? (
                                                <Link
                                                    href={`/screening/${scr._id}`}
                                                    className="inline-flex items-center gap-2 text-sm bg-success-light text-success px-4 py-2 rounded-xl font-semibold hover:shadow-sm transition-shadow"
                                                >
                                                    <span className="text-lg">
                                                        🎯
                                                    </span>{" "}
                                                    Score: {scr.overallScore}%
                                                    →
                                                </Link>
                                            ) : (
                                                <button
                                                    onClick={() =>
                                                        handleScreen(
                                                            resume._id
                                                        )
                                                    }
                                                    disabled={
                                                        isScreening ||
                                                        resume.status !==
                                                            "parsed"
                                                    }
                                                    className="inline-flex items-center gap-2 text-sm bg-primary text-white px-4 py-2 rounded-xl font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                                >
                                                    {isScreening ? (
                                                        <>
                                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                            Screening...
                                                        </>
                                                    ) : (
                                                        <>🤖 Screen with AI</>
                                                    )}
                                                </button>
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
