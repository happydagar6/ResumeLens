"use client";

import Link from "next/link";

export default function SignupPage() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-6">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2 justify-center mb-3">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                            <span className="text-white font-bold text-lg">R</span>
                        </div>
                    </Link>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">
                        Create your account
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Get started with RecruitAI</p>
                </div>

                <div className="bg-white border border-border/60 rounded-2xl p-7 shadow-sm text-center">
                    <div className="w-14 h-14 bg-primary-light rounded-2xl flex items-center justify-center mx-auto mb-5">
                        <span className="text-primary text-2xl">✨</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                        Authentication is coming soon.<br />
                        You can access all pages directly for now.
                    </p>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center justify-center h-11 w-full bg-primary text-white font-semibold text-sm rounded-xl hover:bg-primary-hover transition-colors shadow-sm hover:shadow-md"
                    >
                        Go to Dashboard →
                    </Link>
                </div>

                <p className="text-center text-sm text-muted-foreground mt-6">
                    Already have an account?{" "}
                    <Link href="/login" className="text-primary font-semibold hover:text-primary-hover">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
