import { Card } from "@/components/ui/card";
import { BrainCircuit } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2">
          <Link href="/" className="flex items-center gap-2 mb-2">
            <BrainCircuit className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">RecruitAI</span>
          </Link>
        </div>
        <Card className="p-6">{children}</Card>
      </div>
    </div>
  );
}
