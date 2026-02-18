"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { jobsAPI } from "@/lib/api";

export default function DashboardPage() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        jobsAPI
            .getAll()
            .then((data) => setJobs(data.data.jobs || []))
            .catch(() => setJobs([]))
            .finally(() => setLoading(false));
    }, []);

    const openCount = jobs.filter((j) => j.status === "open").length;
    const closedCount = jobs.filter((j) => j.status === "closed").length;

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="bg-white border-b border-border/60 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">R</span>
                        </div>
                        <span className="text-lg font-bold text-foreground tracking-tight">
                            Recruit<span className="text-primary">AI</span>
                        </span>
                    </Link>
                    <nav className="flex items-center gap-1">
                        <Link
                            href="/dashboard"
                            className="text-sm font-semibold text-primary bg-primary-light px-4 py-2 rounded-lg"
                        >
                            Dashboard
                        </Link>
                        <Link
                            href="/jobs"
                            className="text-sm font-medium text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg hover:bg-muted transition-colors"
                        >
                            Jobs
                        </Link>
                    </nav>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                {/* Page Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">
                            Dashboard
                        </h2>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Overview of your recruitment pipeline
                        </p>
                    </div>
                    <Link
                        href="/jobs"
                        className="inline-flex items-center h-10 px-5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary-hover transition-colors shadow-sm hover:shadow-md"
                    >
                        + New Job
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
                    <div className="bg-white border border-border/60 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-lg">
                                💼
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">
                                Total Jobs
                            </p>
                        </div>
                        <p className="text-4xl font-extrabold text-foreground">
                            {loading ? "–" : jobs.length}
                        </p>
                    </div>
                    <div className="bg-white border border-border/60 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-success-light rounded-xl flex items-center justify-center text-lg">
                                ✅
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">
                                Open Positions
                            </p>
                        </div>
                        <div className="flex items-baseline gap-3">
                            <p className="text-4xl font-extrabold text-success">
                                {loading ? "–" : openCount}
                            </p>
                            {!loading && jobs.length > 0 && (
                                <span className="text-sm font-medium text-muted-foreground">
                                    of {jobs.length} total
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="bg-white border border-border/60 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center text-lg">
                                🔒
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">
                                Closed
                            </p>
                        </div>
                        <p className="text-4xl font-extrabold text-muted-foreground">
                            {loading ? "–" : closedCount}
                        </p>
                    </div>
                </div>

                {/* Jobs List */}
                <div>
                    <h3 className="text-lg font-bold text-foreground mb-4">
                        Recent Jobs
                    </h3>
                    {loading ? (
                        <div className="bg-white border border-border/60 rounded-2xl p-10 text-center shadow-sm">
                            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                            <p className="text-muted-foreground text-sm">
                                Loading jobs...
                            </p>
                        </div>
                    ) : jobs.length === 0 ? (
                        <div className="bg-white border border-border/60 rounded-2xl p-12 text-center shadow-sm">
                            <div className="text-5xl mb-4">📋</div>
                            <p className="text-foreground font-bold text-lg mb-2">
                                No jobs yet
                            </p>
                            <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
                                Create your first job posting to start screening
                                candidates with AI
                            </p>
                            <Link
                                href="/jobs"
                                className="inline-flex items-center h-10 px-6 bg-primary text-white font-semibold text-sm rounded-lg hover:bg-primary-hover transition-colors shadow-sm"
                            >
                                Create Job →
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {jobs.map((job) => (
                                <Link
                                    key={job._id}
                                    href={`/jobs/${job._id}`}
                                    className="flex items-center justify-between bg-white border border-border/60 rounded-2xl p-5 hover:shadow-md hover:border-primary/20 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-11 h-11 bg-primary-light rounded-xl flex items-center justify-center text-primary font-bold text-sm shrink-0">
                                            {job.title?.charAt(0)?.toUpperCase() || "J"}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">
                                                {job.title}
                                            </h4>
                                            <p className="text-sm text-muted-foreground mt-0.5">
                                                {job.company} •{" "}
                                                {job.location || "Remote"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span
                                            className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                                                job.status === "open"
                                                    ? "bg-success-light text-success"
                                                    : job.status === "closed"
                                                    ? "bg-secondary text-muted-foreground"
                                                    : "bg-warning-light text-warning"
                                            }`}
                                        >
                                            {job.status}
                                        </span>
                                        <span className="text-muted-foreground group-hover:text-primary transition-colors">
                                            →
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
