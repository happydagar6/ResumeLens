import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrainCircuit, ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
            <BrainCircuit className="h-4 w-4" />
            AI-Powered Recruitment
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Screen Resumes{" "}
            <span className="text-primary">Smarter</span>, Hire{" "}
            <span className="text-primary">Faster</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            RecruitAI uses artificial intelligence to parse resumes, score candidates
            against job descriptions, and generate personalized interview questions —
            saving you hours of manual screening.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/signup">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
