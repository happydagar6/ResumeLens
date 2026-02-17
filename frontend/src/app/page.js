"use client";

import Link from "next/link";

export default function Home() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
            {/* Hero Section */}
            <div className="max-w-2xl text-center space-y-8">
                {/* Logo / Brand */}
                <div className="space-y-4">
                    <h1 className="text-5xl font-bold tracking-tight text-foreground">
                        Recruit<span className="text-primary">AI</span>
                    </h1>
                    <p className="text-xl text-muted-foreground leading-relaxed">
                        AI-powered resume screening that saves recruiters
                        <span className="text-accent font-semibold"> 80% of screening time</span>.
                        Score candidates, identify top talent, and generate personalized interview questions — all in one platform.
                    </p>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-primary text-white font-medium hover:bg-primary-hover transition-colors"
                    >
                        Go to Dashboard →
                    </Link>
                    <Link
                        href="/jobs"
                        className="inline-flex items-center justify-center h-12 px-8 rounded-xl border border-border text-foreground font-medium hover:bg-card transition-colors"
                    >
                        View Jobs
                    </Link>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8">
                    <div className="rounded-xl bg-card border border-border p-5 text-left">
                        <div className="text-2xl mb-2">📄</div>
                        <h3 className="text-foreground font-semibold mb-1">Smart Parsing</h3>
                        <p className="text-sm text-muted-foreground">Upload PDFs and extract structured candidate data automatically.</p>
                    </div>
                    <div className="rounded-xl bg-card border border-border p-5 text-left">
                        <div className="text-2xl mb-2">🎯</div>
                        <h3 className="text-foreground font-semibold mb-1">AI Scoring</h3>
                        <p className="text-sm text-muted-foreground">Score candidates 0-100% with clear explanations and skill matching.</p>
                    </div>
                    <div className="rounded-xl bg-card border border-border p-5 text-left">
                        <div className="text-2xl mb-2">💬</div>
                        <h3 className="text-foreground font-semibold mb-1">Interview Prep</h3>
                        <p className="text-sm text-muted-foreground">Generate personalized, role-specific interview questions.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
