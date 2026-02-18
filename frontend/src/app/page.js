"use client";

import Link from "next/link";

export default function Home() {
    return (
        <div className="min-h-screen bg-background">
            {/* Navbar */}
            <nav className="bg-white border-b border-border/60">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">R</span>
                        </div>
                        <span className="text-lg font-bold text-foreground tracking-tight">
                            Recruit<span className="text-primary">AI</span>
                        </span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/login"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-lg hover:bg-muted"
                        >
                            Log In
                        </Link>
                        <Link
                            href="/signup"
                            className="text-sm bg-primary text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-primary-hover transition-colors shadow-sm hover:shadow-md"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="max-w-6xl mx-auto px-6 pt-24 pb-20">
                <div className="max-w-2xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 bg-primary-light text-primary text-sm font-semibold px-4 py-2 rounded-full mb-8 border border-primary/10">
                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                        AI-Powered Recruitment Platform
                    </div>
                    <h2 className="text-5xl font-extrabold text-foreground tracking-tight leading-[1.15] mb-6">
                        Hire Smarter with{" "}
                        <span className="text-primary">Intelligent Screening</span>
                    </h2>
                    <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-xl mx-auto">
                        Upload resumes, get AI-powered candidate scores, skill
                        analysis, and personalized interview questions — all in
                        seconds.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center justify-center h-12 px-8 rounded-lg bg-primary text-white font-semibold text-base hover:bg-primary-hover transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                        >
                            Go to Dashboard →
                        </Link>
                        <Link
                            href="/jobs"
                            className="inline-flex items-center justify-center h-12 px-8 rounded-lg border-2 border-border text-foreground font-semibold text-base hover:bg-white hover:border-primary/30 transition-all"
                        >
                            View Jobs
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="max-w-6xl mx-auto px-6 pb-24">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {[
                        {
                            icon: "📄",
                            title: "Smart PDF Parsing",
                            desc: "Upload PDF resumes and extract structured candidate data automatically with AI.",
                            color: "bg-blue-50 border-blue-100",
                        },
                        {
                            icon: "🎯",
                            title: "AI Candidate Scoring",
                            desc: "Score candidates 0–100% with clear explanations, skill matching, and recommendations.",
                            color: "bg-indigo-50 border-indigo-100",
                        },
                        {
                            icon: "💬",
                            title: "Interview Prep",
                            desc: "Generate personalized, role-specific interview questions based on each candidate.",
                            color: "bg-violet-50 border-violet-100",
                        },
                    ].map((f) => (
                        <div
                            key={f.title}
                            className={`rounded-2xl border p-7 ${f.color} hover:shadow-lg transition-shadow`}
                        >
                            <div className="text-3xl mb-4">{f.icon}</div>
                            <h3 className="text-foreground font-bold text-lg mb-2">
                                {f.title}
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {f.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-border/60 bg-white">
                <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        © 2025 RecruitAI. All rights reserved.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Built with Next.js & Express
                    </p>
                </div>
            </footer>
        </div>
    );
}
