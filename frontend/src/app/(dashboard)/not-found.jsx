import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <SearchX className="h-10 w-10 text-muted-foreground" />
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Page not found</h2>
        <p className="text-sm text-muted-foreground">
          The resource you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
      </div>
      <Button asChild>
        <Link href="/jobs">Back to Jobs</Link>
      </Button>
    </div>
  );
}
