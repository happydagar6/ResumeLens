"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { jobsAPI } from "@/lib/api";

export default function DashboardPage() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        jobsAPI.getAll()
            .then((data) => setJobs(data.data.jobs || []))
            .catch(() => setJobs([]))
            .finally(() => setLoading(false));
    }, []);

    const openCount = jobs.filter(j => j.status === "open").length;
    const closedCount = jobs.filter(j => j.status === "closed").length;

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="text-xl font-bold text-foreground tracking-tight">
                        Recruit<span className="text-primary">AI</span>
                    </Link>
                    <nav className="flex items-center gap-1">
                        <Link href="/dashboard" className="text-sm font-medium text-primary bg-primary-light px-3 py-1.5 rounded-md">
                            Dashboard
                        </Link>
                        <Link href="/jobs" className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-secondary transition-colors">
                            Jobs
                        </Link>
                    </nav>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                {/* Page Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
                        <p className="text-muted-foreground mt-1 text-sm">Overview of your recruitment pipeline</p>
                    </div>
                    <Link
                        href="/jobs"
                        className="inline-flex items-center h-10 px-5 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary-hover transition-colors shadow-sm"
                    >
                        + New Job
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                        <p className="text-sm text-muted-foreground mb-1">Total Jobs</p>
                        <p className="text-3xl font-bold text-foreground">{jobs.length}</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                        <p className="text-sm text-muted-foreground mb-1">Open Positions</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-success">{openCount}</p>
                            {jobs.length > 0 && (
                                <span className="text-xs text-muted-foreground">
                                    ({Math.round((openCount / jobs.length) * 100)}%)
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                        <p className="text-sm text-muted-foreground mb-1">Closed</p>
                        <p className="text-3xl font-bold text-muted-foreground">{closedCount}</p>
                    </div>
                </div>

                {/* Jobs List */}
                <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Recent Jobs</h3>
                    {loading ? (
                        <div className="bg-card border border-border rounded-xl p-8 text-center shadow-sm">
                            <div className="text-muted-foreground">Loading jobs...</div>
                        </div>
                    ) : jobs.length === 0 ? (
                        <div className="bg-card border border-border rounded-xl p-10 text-center shadow-sm">
                            <div className="text-4xl mb-3">📋</div>
                            <p className="text-foreground font-medium mb-1">No jobs yet</p>
                            <p className="text-sm text-muted-foreground mb-4">Create your first job posting to get started</p>
                            <Link href="/jobs" className="text-sm text-primary font-medium hover:text-primary-hover">
                                Create Job →
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {jobs.map((job) => (
                                <Link
                                    key={job._id}
                                    href={`/jobs/${job._id}`}
                                    className="flex items-center justify-between bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/20 transition-all shadow-sm"
                                >
                                    <div>
                                        <h4 className="font-semibold text-foreground">{job.title}</h4>
                                        <p className="text-sm text-muted-foreground mt-0.5">
                                            {job.company} • {job.location || "Remote"}
                                        </p>
                                    </div>
                                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                                        job.status === "open"
                                            ? "bg-success-light text-success"
                                            : job.status === "closed"
                                            ? "bg-secondary text-muted-foreground"
                                            : "bg-warning-light text-warning"
                                    }`}>
                                        {job.status}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
