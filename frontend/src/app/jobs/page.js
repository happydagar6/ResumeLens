"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { jobsAPI } from "@/lib/api";

export default function JobsPage() {
    const [showForm, setShowForm] = useState(false);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        title: "", company: "", description: "", requirements: "",
        skills: "", location: "", type: "full-time", salaryRange: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        jobsAPI.getAll()
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
                skills: formData.skills.split(",").map(s => s.trim()).filter(Boolean),
            };
            const data = await jobsAPI.create(body);
            setJobs([data.data.job, ...jobs]);
            setShowForm(false);
            setFormData({ title: "", company: "", description: "", requirements: "", skills: "", location: "", type: "full-time", salaryRange: "" });
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const inputClass = "w-full h-11 px-4 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="text-xl font-bold text-foreground tracking-tight">
                        Recruit<span className="text-primary">AI</span>
                    </Link>
                    <nav className="flex items-center gap-1">
                        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-secondary transition-colors">
                            Dashboard
                        </Link>
                        <Link href="/jobs" className="text-sm font-medium text-primary bg-primary-light px-3 py-1.5 rounded-md">
                            Jobs
                        </Link>
                    </nav>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">Job Postings</h2>
                        <p className="text-sm text-muted-foreground mt-1">{jobs.length} total job{jobs.length !== 1 ? "s" : ""}</p>
                    </div>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className={`inline-flex items-center h-10 px-5 rounded-lg font-medium text-sm transition-colors shadow-sm ${
                            showForm
                                ? "bg-secondary text-foreground border border-border hover:bg-card-hover"
                                : "bg-primary text-white hover:bg-primary-hover"
                        }`}
                    >
                        {showForm ? "✕ Cancel" : "+ Create Job"}
                    </button>
                </div>

                {/* Create Job Form */}
                {showForm && (
                    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 mb-8 shadow-sm">
                        <h3 className="text-lg font-semibold text-foreground mb-5">New Job Posting</h3>

                        {error && (
                            <div className="bg-error-light border border-error/20 text-error text-sm rounded-lg p-3 mb-4">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-foreground">Job Title *</label>
                                <input type="text" required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})}
                                    className={inputClass} placeholder="e.g. Senior React Developer" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-foreground">Company *</label>
                                <input type="text" required value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})}
                                    className={inputClass} placeholder="e.g. Acme Corp" />
                            </div>
                        </div>

                        <div className="space-y-1.5 mb-4">
                            <label className="text-sm font-medium text-foreground">Job Description *</label>
                            <textarea required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={4}
                                className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                                placeholder="Describe the role, responsibilities, and qualifications..." />
                        </div>

                        <div className="space-y-1.5 mb-4">
                            <label className="text-sm font-medium text-foreground">Required Skills <span className="text-muted-foreground font-normal">(comma separated)</span></label>
                            <input type="text" value={formData.skills} onChange={(e) => setFormData({...formData, skills: e.target.value})}
                                className={inputClass} placeholder="React, Node.js, MongoDB, TypeScript" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-foreground">Location</label>
                                <input type="text" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})}
                                    className={inputClass} placeholder="Remote / New York" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-foreground">Job Type</label>
                                <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}
                                    className={inputClass}>
                                    <option value="full-time">Full-Time</option>
                                    <option value="part-time">Part-Time</option>
                                    <option value="contract">Contract</option>
                                    <option value="internship">Internship</option>
                                    <option value="remote">Remote</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-foreground">Salary Range</label>
                                <input type="text" value={formData.salaryRange} onChange={(e) => setFormData({...formData, salaryRange: e.target.value})}
                                    className={inputClass} placeholder="$80k – $120k" />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2 border-t border-border">
                            <button type="submit" disabled={submitting}
                                className="h-10 px-6 bg-primary text-white font-medium text-sm rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 shadow-sm mt-4">
                                {submitting ? "Creating..." : "Create Job"}
                            </button>
                            <button type="button" onClick={() => setShowForm(false)}
                                className="h-10 px-4 text-sm text-muted-foreground hover:text-foreground transition-colors mt-4">
                                Cancel
                            </button>
                        </div>
                    </form>
                )}

                {/* Jobs List */}
                {loading ? (
                    <div className="bg-card border border-border rounded-xl p-8 text-center shadow-sm">
                        <div className="text-muted-foreground">Loading jobs...</div>
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="bg-card border border-border rounded-xl p-10 text-center shadow-sm">
                        <div className="text-4xl mb-3">💼</div>
                        <p className="text-foreground font-medium mb-1">No jobs posted yet</p>
                        <p className="text-sm text-muted-foreground">Click &quot;Create Job&quot; above to add your first job posting</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {jobs.map((job) => (
                            <Link key={job._id} href={`/jobs/${job._id}`}
                                className="flex items-center justify-between bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/20 transition-all shadow-sm">
                                <div>
                                    <h3 className="font-semibold text-foreground">{job.title}</h3>
                                    <p className="text-sm text-muted-foreground mt-0.5">
                                        {job.company} • {job.location || "Remote"} • {job.type}
                                    </p>
                                    {job.skills?.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {job.skills.slice(0, 5).map((skill, i) => (
                                                <span key={i} className="text-xs bg-primary-light text-primary px-2 py-0.5 rounded-md font-medium">{skill}</span>
                                            ))}
                                            {job.skills.length > 5 && (
                                                <span className="text-xs text-muted-foreground">+{job.skills.length - 5} more</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <span className={`text-xs font-medium px-3 py-1 rounded-full shrink-0 ml-4 ${
                                    job.status === "open"
                                        ? "bg-success-light text-success"
                                        : "bg-secondary text-muted-foreground"
                                }`}>
                                    {job.status}
                                </span>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
