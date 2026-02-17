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

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="text-xl font-bold text-foreground">
                        Recruit<span className="text-primary">AI</span>
                    </Link>
                    <nav className="flex items-center gap-4">
                        <Link href="/dashboard" className="text-sm text-foreground font-medium">Dashboard</Link>
                        <Link href="/jobs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Jobs</Link>
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-6 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
                        <p className="text-muted-foreground mt-1">Manage your job postings and candidates</p>
                    </div>
                    <Link
                        href="/jobs"
                        className="inline-flex items-center h-10 px-5 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary-hover transition-colors"
                    >
                        + New Job Posting
                    </Link>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="bg-card border border-border rounded-xl p-5">
                        <p className="text-sm text-muted-foreground">Total Jobs</p>
                        <p className="text-3xl font-bold text-foreground mt-1">{jobs.length}</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-5">
                        <p className="text-sm text-muted-foreground">Open Positions</p>
                        <p className="text-3xl font-bold text-success mt-1">{jobs.filter(j => j.status === "open").length}</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-5">
                        <p className="text-sm text-muted-foreground">Closed</p>
                        <p className="text-3xl font-bold text-muted-foreground mt-1">{jobs.filter(j => j.status === "closed").length}</p>
                    </div>
                </div>

                {/* Jobs List */}
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-foreground">Recent Jobs</h3>
                    {loading ? (
                        <div className="text-muted-foreground animate-pulse">Loading jobs...</div>
                    ) : jobs.length === 0 ? (
                        <div className="bg-card border border-border rounded-xl p-8 text-center">
                            <p className="text-muted-foreground">No jobs yet. Create your first job posting to get started!</p>
                        </div>
                    ) : (
                        jobs.map((job) => (
                            <Link
                                key={job._id}
                                href={`/jobs/${job._id}`}
                                className="block bg-card border border-border rounded-xl p-5 hover:bg-card-hover transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-semibold text-foreground">{job.title}</h4>
                                        <p className="text-sm text-muted-foreground mt-1">{job.company} • {job.location || "Remote"}</p>
                                    </div>
                                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${job.status === "open" ? "bg-success/10 text-success" : job.status === "closed" ? "bg-muted text-muted-foreground" : "bg-warning/10 text-warning"}`}>
                                        {job.status}
                                    </span>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}
