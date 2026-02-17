"use client";

import Link from "next/link";

export default function SignupPage() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-6">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <Link href="/" className="text-2xl font-bold text-foreground tracking-tight">
                        Recruit<span className="text-primary">AI</span>
                    </Link>
                    <p className="text-sm text-muted-foreground mt-2">Create your account</p>
                </div>

                <div className="bg-card border border-border rounded-xl p-6 shadow-sm text-center">
                    <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center mx-auto mb-4">
                        <span className="text-primary text-xl">✨</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-5">
                        Authentication is coming soon. You can access all pages directly for now.
                    </p>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center justify-center h-10 w-full bg-primary text-white font-medium text-sm rounded-lg hover:bg-primary-hover transition-colors shadow-sm"
                    >
                        Go to Dashboard →
                    </Link>
                </div>

                <p className="text-center text-sm text-muted-foreground mt-5">
                    Already have an account? <Link href="/login" className="text-primary font-medium hover:text-primary-hover">Sign in</Link>
                </p>
            </div>
        </div>
    );
}
