"use client";

import Link from "next/link";

export default function LoginPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-6">
            <div className="w-full max-w-md space-y-8 text-center">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">
                        Welcome back to Recruit<span className="text-primary">AI</span>
                    </h1>
                    <p className="mt-2 text-muted-foreground">Authentication is coming soon.</p>
                </div>

                <div className="bg-card border border-border rounded-2xl p-8 space-y-4">
                    <p className="text-muted-foreground text-sm">
                        Auth has been temporarily disabled. You can access all pages directly.
                    </p>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center justify-center h-11 w-full bg-primary text-white font-medium rounded-xl hover:bg-primary-hover transition-colors"
                    >
                        Go to Dashboard →
                    </Link>
                </div>

                <p className="text-sm text-muted-foreground">
                    Don&apos;t have an account?{" "}
                    <Link href="/signup" className="text-accent hover:text-primary font-medium">Sign up</Link>
                </p>
            </div>
        </div>
    );
}
