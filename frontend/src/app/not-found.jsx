// src/app/not-found.jsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrainCircuit, Home, LayoutDashboard, ArrowLeft } from "lucide-react";

export default function RootNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />

      {/* Brand Icon */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-lg shadow-primary/10 animate-in fade-in zoom-in duration-500">
        <BrainCircuit className="h-9 w-9" />
      </div>

      {/* 404 Title */}
      <div className="space-y-3 max-w-md">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-mono font-medium text-muted-foreground">
          Error 404 • Resource Not Found
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          Lost in the Pipeline?
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The page or candidate application you are looking for doesn&apos;t exist, has been moved, or the link may be expired.
        </p>
      </div>

      {/* Navigation Actions */}
      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
        <Button variant="default" asChild className="h-10 px-5 gap-2 shadow-md shadow-primary/25">
          <Link href="/dashboard">
            <LayoutDashboard className="h-4 w-4" />
            Go to Dashboard
          </Link>
        </Button>
        <Button variant="outline" asChild className="h-10 px-5 gap-2 border-border/80 hover:bg-muted/60">
          <Link href="/">
            <Home className="h-4 w-4" />
            Return Home
          </Link>
        </Button>
      </div>

      {/* Footer hint */}
      <p className="mt-12 text-xs text-muted-foreground">
        ResumeLens ATS • AI-Powered Recruitment Infrastructure
      </p>
    </div>
  );
}
