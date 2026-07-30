import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-linear-to-br from-indigo-50 via-violet-50/60 to-cyan-50 dark:from-indigo-950 dark:via-violet-950/60 dark:to-cyan-950" />
      {/* Decorative blobs */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-violet-500/15 blur-3xl" />
      <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-3xl" />

      {/* Content */}
      <div className="relative w-full max-w-md space-y-6 z-10">
        <div className="flex flex-col items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-violet-600 shadow-xl shadow-primary/40">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <span className="text-3xl font-extrabold gradient-brand">ResumeLens</span>
          </Link>
          <p className="text-sm text-muted-foreground">AI-powered recruitment platform</p>
        </div>
        <Card className="glass rounded-2xl border-border/40 p-6 shadow-2xl shadow-primary/10">
          {children}
        </Card>
      </div>
    </div>
  );
}
