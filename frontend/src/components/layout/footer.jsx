import { BrainCircuit } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ResumeLens. All rights reserved.
          </span>
        </div>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <Link href="/login" className="hover:text-foreground transition-colors">
            Login
          </Link>
          <Link href="/signup" className="hover:text-foreground transition-colors">
            Sign Up
          </Link>
        </div>
      </div>
    </footer>
  );
}
