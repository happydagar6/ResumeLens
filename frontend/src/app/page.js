"use client";

import Link from "next/link";

export default function Home() {
    return (
        <div className="min-h-screen bg-background">
            {/* Navbar */}
            <nav className="border-b border-border bg-card">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-foreground tracking-tight">
                        Recruit<span className="text-primary">AI</span>
                    </h1>
                    <div className="flex items-center gap-3">
                        <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2">
                            Log In
                        </Link>
                        <Link href="/signup" className="text-sm bg-primary text-white font-medium px-4 py-2 rounded-lg hover:bg-primary-hover transition-colors">
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="max-w-6xl mx-auto px-6 pt-20 pb-16">
                <div className="max-w-2xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 bg-primary-light text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-6">
                        ✨ AI-Powered Recruitment Platform
                    </div>
                    <h2 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight leading-tight mb-5">
                        Hire Smarter with <br />
                        <span className="text-primary">Intelligent Screening</span>
                    </h2>
                    <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-xl mx-auto">
                        Upload resumes, get AI-powered candidate scores, skill analysis, and personalized interview questions — all in seconds.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center justify-center h-12 px-8 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover transition-colors shadow-sm"
                        >
                            Go to Dashboard →
                        </Link>
                        <Link
                            href="/jobs"
                            className="inline-flex items-center justify-center h-12 px-8 rounded-lg border border-border text-foreground font-medium hover:bg-secondary transition-colors"
                        >
                            View Jobs
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="max-w-6xl mx-auto px-6 pb-20">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
                        <div className="w-10 h-10 bg-primary-light rounded-lg flex items-center justify-center text-lg mb-4">📄</div>
                        <h3 className="text-foreground font-semibold mb-2">Smart PDF Parsing</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">Upload PDF resumes and extract structured candidate data automatically with AI.</p>
                    </div>
                    <div className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
                        <div className="w-10 h-10 bg-primary-light rounded-lg flex items-center justify-center text-lg mb-4">🎯</div>
                        <h3 className="text-foreground font-semibold mb-2">AI Candidate Scoring</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">Score candidates 0–100% with clear explanations, skill matching, and recommendations.</p>
                    </div>
                    <div className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
                        <div className="w-10 h-10 bg-primary-light rounded-lg flex items-center justify-center text-lg mb-4">💬</div>
                        <h3 className="text-foreground font-semibold mb-2">Interview Prep</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">Generate personalized, role-specific interview questions based on each candidate.</p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-border bg-card">
                <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">© 2025 RecruitAI. All rights reserved.</p>
                    <p className="text-sm text-muted-foreground">Built with Next.js & Express</p>
                </div>
            </footer>
        </div>
    );
}
