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

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="text-xl font-bold text-foreground">
                        Recruit<span className="text-primary">AI</span>
                    </Link>
                    <nav className="flex items-center gap-4">
                        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
                        <Link href="/jobs" className="text-sm text-foreground font-medium">Jobs</Link>
                    </nav>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-foreground">Job Postings</h2>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="inline-flex items-center h-10 px-5 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary-hover transition-colors"
                    >
                        {showForm ? "Cancel" : "+ Create Job"}
                    </button>
                </div>

                {/* Create Job Form */}
                {showForm && (
                    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 mb-8 space-y-4">
                        {error && <div className="bg-error/10 border border-error/20 text-error text-sm rounded-lg p-3">{error}</div>}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Job Title *</label>
                                <input type="text" required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})}
                                    className="w-full h-11 px-4 rounded-xl bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Senior React Developer" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Company *</label>
                                <input type="text" required value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})}
                                    className="w-full h-11 px-4 rounded-xl bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Acme Corp" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Job Description *</label>
                            <textarea required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={4}
                                className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none" placeholder="Describe the role, responsibilities, and qualifications..." />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Skills <span className="text-muted-foreground">(comma separated)</span></label>
                            <input type="text" value={formData.skills} onChange={(e) => setFormData({...formData, skills: e.target.value})}
                                className="w-full h-11 px-4 rounded-xl bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="React, Node.js, MongoDB" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Location</label>
                                <input type="text" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})}
                                    className="w-full h-11 px-4 rounded-xl bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Remote / NYC" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Type</label>
                                <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}
                                    className="w-full h-11 px-4 rounded-xl bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                                    <option value="full-time">Full-Time</option>
                                    <option value="part-time">Part-Time</option>
                                    <option value="contract">Contract</option>
                                    <option value="internship">Internship</option>
                                    <option value="remote">Remote</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Salary Range</label>
                                <input type="text" value={formData.salaryRange} onChange={(e) => setFormData({...formData, salaryRange: e.target.value})}
                                    className="w-full h-11 px-4 rounded-xl bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="$80k - $120k" />
                            </div>
                        </div>
                        <button type="submit" disabled={submitting}
                            className="h-11 px-6 bg-primary text-white font-medium rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-50">
                            {submitting ? "Creating..." : "Create Job Posting"}
                        </button>
                    </form>
                )}

                {/* Jobs List */}
                {loading ? (
                    <div className="text-muted-foreground animate-pulse">Loading...</div>
                ) : jobs.length === 0 ? (
                    <div className="bg-card border border-border rounded-xl p-8 text-center">
                        <p className="text-muted-foreground">No jobs yet. Click &quot;Create Job&quot; to get started!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {jobs.map((job) => (
                            <Link key={job._id} href={`/jobs/${job._id}`}
                                className="block bg-card border border-border rounded-xl p-5 hover:bg-card-hover transition-colors">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold text-foreground">{job.title}</h3>
                                        <p className="text-sm text-muted-foreground mt-1">{job.company} • {job.location || "Remote"} • {job.type}</p>
                                        {job.skills?.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {job.skills.slice(0, 5).map((skill, i) => (
                                                    <span key={i} className="text-xs bg-primary/10 text-accent px-2 py-0.5 rounded-md">{skill}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${job.status === "open" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                                        {job.status}
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
