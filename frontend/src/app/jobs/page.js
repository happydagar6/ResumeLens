"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { jobsAPI } from "@/lib/api";

export default function JobsPage() {
    const [showForm, setShowForm] = useState(false);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        title: "",
        company: "",
        description: "",
        requirements: "",
        skills: "",
        location: "",
        type: "full-time",
        salaryRange: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        jobsAPI
            .getAll()
            .then((data) => setJobs(data.data.jobs || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSubmitting(true);
        try {
            const body = {
                ...formData,
                skills: formData.skills
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
            };
            const data = await jobsAPI.create(body);
            setJobs([data.data.job, ...jobs]);
            setShowForm(false);
            setFormData({
                title: "",
                company: "",
                description: "",
                requirements: "",
                skills: "",
                location: "",
                type: "full-time",
                salaryRange: "",
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

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
                            className="text-sm font-medium text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg hover:bg-muted transition-colors"
                        >
                            Dashboard
                        </Link>
                        <Link
                            href="/jobs"
                            className="text-sm font-semibold text-primary bg-primary-light px-4 py-2 rounded-lg"
                        >
                            Jobs
                        </Link>
                    </nav>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">
                            Job Postings
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {jobs.length} total job{jobs.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className={`inline-flex items-center h-10 px-5 rounded-lg font-semibold text-sm transition-all ${
                            showForm
                                ? "bg-white text-foreground border-2 border-border hover:bg-muted"
                                : "bg-primary text-white hover:bg-primary-hover shadow-sm hover:shadow-md"
                        }`}
                    >
                        {showForm ? "✕ Cancel" : "+ Create Job"}
                    </button>
                </div>

                {/* Create Job Form */}
                {showForm && (
                    <form
                        onSubmit={handleSubmit}
                        className="bg-white border border-border/60 rounded-2xl p-7 mb-8 shadow-sm"
                    >
                        <h3 className="text-lg font-bold text-foreground mb-6">
                            New Job Posting
                        </h3>

                        {error && (
                            <div className="bg-error-light border border-error/20 text-error text-sm font-medium rounded-xl p-4 mb-5">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-foreground">
                                    Job Title <span className="text-error">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            title: e.target.value,
                                        })
                                    }
                                    className="w-full h-11 px-4 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground/60 text-sm"
                                    placeholder="e.g. Senior React Developer"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-foreground">
                                    Company <span className="text-error">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.company}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            company: e.target.value,
                                        })
                                    }
                                    className="w-full h-11 px-4 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground/60 text-sm"
                                    placeholder="e.g. Acme Corp"
                                />
                            </div>
                        </div>

                        <div className="space-y-2 mb-5">
                            <label className="text-sm font-semibold text-foreground">
                                Job Description <span className="text-error">*</span>
                            </label>
                            <textarea
                                required
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        description: e.target.value,
                                    })
                                }
                                rows={4}
                                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground/60 resize-none text-sm leading-relaxed"
                                placeholder="Describe the role, responsibilities, and qualifications..."
                            />
                        </div>

                        <div className="space-y-2 mb-5">
                            <label className="text-sm font-semibold text-foreground">
                                Required Skills{" "}
                                <span className="text-muted-foreground font-normal">
                                    (comma separated)
                                </span>
                            </label>
                            <input
                                type="text"
                                value={formData.skills}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        skills: e.target.value,
                                    })
                                }
                                className="w-full h-11 px-4 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground/60 text-sm"
                                placeholder="React, Node.js, MongoDB, TypeScript"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-7">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-foreground">
                                    Location
                                </label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            location: e.target.value,
                                        })
                                    }
                                    className="w-full h-11 px-4 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground/60 text-sm"
                                    placeholder="Remote / New York"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-foreground">
                                    Job Type
                                </label>
                                <select
                                    value={formData.type}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            type: e.target.value,
                                        })
                                    }
                                    className="w-full h-11 px-4 rounded-xl bg-background border border-border text-foreground text-sm"
                                >
                                    <option value="full-time">Full-Time</option>
                                    <option value="part-time">Part-Time</option>
                                    <option value="contract">Contract</option>
                                    <option value="internship">Internship</option>
                                    <option value="remote">Remote</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-foreground">
                                    Salary Range
                                </label>
                                <input
                                    type="text"
                                    value={formData.salaryRange}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            salaryRange: e.target.value,
                                        })
                                    }
                                    className="w-full h-11 px-4 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground/60 text-sm"
                                    placeholder="$80k – $120k"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-5 border-t border-border/60">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="h-11 px-7 bg-primary text-white font-semibold text-sm rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-50 shadow-sm"
                            >
                                {submitting ? "Creating..." : "Create Job"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="h-11 px-5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}

                {/* Jobs List */}
                {loading ? (
                    <div className="bg-white border border-border/60 rounded-2xl p-10 text-center shadow-sm">
                        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        <p className="text-muted-foreground text-sm">
                            Loading jobs...
                        </p>
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="bg-white border border-border/60 rounded-2xl p-12 text-center shadow-sm">
                        <div className="text-5xl mb-4">💼</div>
                        <p className="text-foreground font-bold text-lg mb-2">
                            No jobs posted yet
                        </p>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                            Click &quot;Create Job&quot; above to add your first
                            job posting
                        </p>
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
                                        {job.title
                                            ?.charAt(0)
                                            ?.toUpperCase() || "J"}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                                            {job.title}
                                        </h3>
                                        <p className="text-sm text-muted-foreground mt-0.5">
                                            {job.company} •{" "}
                                            {job.location || "Remote"} •{" "}
                                            {job.type}
                                        </p>
                                        {job.skills?.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {job.skills
                                                    .slice(0, 5)
                                                    .map((skill, i) => (
                                                        <span
                                                            key={i}
                                                            className="text-xs bg-primary-light text-primary px-2.5 py-0.5 rounded-lg font-semibold"
                                                        >
                                                            {skill}
                                                        </span>
                                                    ))}
                                                {job.skills.length > 5 && (
                                                    <span className="text-xs text-muted-foreground font-medium">
                                                        +{job.skills.length - 5}{" "}
                                                        more
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 ml-4">
                                    <span
                                        className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                                            job.status === "open"
                                                ? "bg-success-light text-success"
                                                : "bg-secondary text-muted-foreground"
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
            </main>
        </div>
    );
}
