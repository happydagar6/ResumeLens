"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useSSE } from "@/hooks/use-sse";
import { useUIStore } from "@/store/ui-store";
import DashboardNavbar from "@/components/layout/dashboard-navbar";
import Sidebar, { MobileSidebar } from "@/components/layout/sidebar";
import { LoadingSpinner } from "@/components/common/loading-state";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

export default function DashboardLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { sidebarOpen, actions } = useUIStore();

  // Mount real-time SSE updates strictly within the recruiter dashboard
  useSSE(Boolean(user));

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  // Show spinner while checking auth
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Don't render children until user is confirmed (prevents flash of protected content)
  if (!user) return null;

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-br from-background via-background to-muted/30">
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl shadow-sm shadow-primary/5">
        <div className="flex h-14 items-center px-4 gap-4">
          <Sheet
            open={sidebarOpen}
            onOpenChange={actions.setSidebarOpen}
          >
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={actions.toggleSidebar}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0">
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              <MobileSidebar onClose={() => actions.setSidebarOpen(false)} />
            </SheetContent>
          </Sheet>
          {/* Full-width responsive navbar across the header */}
          <div className="flex-1 min-w-0">
            <DashboardNavbar />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}