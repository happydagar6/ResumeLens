"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sparkles,
  LogOut,
  LayoutDashboard,
  Search,
  Plus,
  Briefcase,
  Users,
  Settings,
  ShieldAlert,
  ChevronRight,
  Building2,
  Command,
  Zap,
  Calendar,
} from "lucide-react";
import NotificationBell from "@/components/dashboard/notification-bell";

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Dynamically maps the current URL pathname to a readable breadcrumb
// ─────────────────────────────────────────────────────────────────────────────
function getBreadcrumbs(pathname) {
  if (pathname === "/dashboard") {
    return { section: "Workspace", page: "Overview" };
  }
  if (pathname.startsWith("/interviews")) {
    return { section: "Schedule", page: "Interview Hub" };
  }
  if (pathname === "/jobs/new") {
    return { section: "Jobs", page: "Create Requisition" };
  }
  if (pathname.startsWith("/jobs/") && pathname.includes("/screening")) {
    return { section: "Jobs", page: "Candidate Pipeline" };
  }
  if (pathname.startsWith("/jobs")) {
    return { section: "Jobs", page: "Active Requisitions" };
  }
  if (pathname.startsWith("/candidates")) {
    return { section: "Talent Pool", page: "Candidate Directory" };
  }
  if (pathname.startsWith("/settings")) {
    return { section: "Preferences", page: "Settings" };
  }
  if (pathname.startsWith("/admin/users/audit-logs") || pathname.startsWith("/admin/audit-logs")) {
    return { section: "Admin Console", page: "Security Audit Trail" };
  }
  if (pathname.startsWith("/admin")) {
    return { section: "Admin Console", page: "Team Management" };
  }
  return { section: "Workspace", page: "Dashboard" };
}

export default function DashboardNavbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Search dialog state (triggered by click or Ctrl+K / Cmd+K)
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const breadcrumb = getBreadcrumbs(pathname);

  // ── Global Keyboard Shortcut: Ctrl+K or Cmd+K to toggle Search ─────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchOpen(false);
    // Direct user to candidate directory search
    router.push(`/candidates?search=${encodeURIComponent(searchQuery.trim())}`);
    setSearchQuery("");
  };

  return (
    <>
      <div className="flex w-full items-center justify-between gap-4">
        {/* ── LEFT SECTION: Logo (Mobile only), Breadcrumbs, and Organization Badge ── */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo & Brand Name: Only shown on mobile since desktop sidebar already shows it */}
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0 md:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-linear-to-br from-primary to-violet-600 shadow-md shadow-primary/30">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-bold gradient-brand">
              ResumeLens
            </span>
          </Link>

          {/* Breadcrumb Navigation Context */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
            <span className="font-medium text-muted-foreground/80 hidden sm:inline">
              {breadcrumb.section}
            </span>
            <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0 hidden sm:inline" />
            <span className="font-semibold text-foreground truncate">
              {breadcrumb.page}
            </span>
          </div>

          {/* Organization Badge (if assigned to an org/company) */}
          {user?.company && (
            <div className="hidden lg:flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/8 border border-primary/15 text-[11px] font-medium text-primary">
              <Building2 className="h-3 w-3" />
              <span className="truncate max-w-[130px]">{user.company}</span>
            </div>
          )}
        </div>

        {/* ── CENTER SECTION: Global Quick Search Input (Ctrl+K) ───────────── */}
        <div className="hidden md:flex flex-1 max-w-md mx-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex w-full items-center justify-between gap-2 px-3 py-1.5 rounded-xl border border-border/70 bg-muted/40 hover:bg-muted/70 text-xs text-muted-foreground transition-all duration-200 shadow-xs group"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="truncate">Search jobs, candidates, skills...</span>
            </div>
            <kbd className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground bg-background rounded-md border border-border/60 shadow-xs">
              <Command className="h-2.5 w-2.5" /> K
            </kbd>
          </button>
        </div>

        {/* ── RIGHT SECTION: Actions, Live Indicator, Notifications, Avatar ── */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Mobile Search Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8 text-muted-foreground"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Live System Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="hidden md:inline">AI Pipeline Live</span>
          </div>

          {/* Real-time Notifications Bell */}
          {user && <NotificationBell />}

          {/* User Profile Avatar & Dropdown */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full p-0 ring-2 ring-primary/20 hover:ring-primary/40 transition-all"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-linear-to-br from-primary to-violet-600 text-white text-xs font-bold">
                      {user.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-60 border-border/60 shadow-xl shadow-primary/10 p-1.5"
              >
                {/* User Info Header */}
                <div className="px-2.5 py-2">
                  <p className="text-sm font-semibold truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5">
                    {user.role && (
                      <span className="inline-block rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold capitalize text-primary border border-primary/20">
                        {user.role.replace("_", " ")}
                      </span>
                    )}
                    {user.company && (
                      <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                        • {user.company}
                      </span>
                    )}
                  </div>
                </div>

                <DropdownMenuSeparator />

                {/* Quick Navigation Links */}
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="cursor-pointer text-xs py-2">
                    <LayoutDashboard className="mr-2 h-3.5 w-3.5 text-primary" />
                    Dashboard Overview
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/candidates" className="cursor-pointer text-xs py-2">
                    <Users className="mr-2 h-3.5 w-3.5 text-primary" />
                    Talent Pool Directory
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/interviews" className="cursor-pointer text-xs py-2">
                    <Calendar className="mr-2 h-3.5 w-3.5 text-primary" />
                    Interview Schedule
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer text-xs py-2">
                    <Settings className="mr-2 h-3.5 w-3.5 text-primary" />
                    Organization Settings
                  </Link>
                </DropdownMenuItem>

                {/* Admin Console Link (Admins Only) */}
                {user.role === "admin" && (
                  <DropdownMenuItem asChild>
                    <Link
                      href="/admin/users"
                      className="cursor-pointer text-xs py-2 text-violet-600 dark:text-violet-400 font-medium"
                    >
                      <ShieldAlert className="mr-2 h-3.5 w-3.5" />
                      Admin Console
                    </Link>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                {/* Logout Button */}
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive cursor-pointer text-xs py-2 font-medium"
                >
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* ── GLOBAL QUICK-JUMP SEARCH DIALOG (Modal) ───────────────────────── */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-border/80 shadow-2xl">
          <DialogHeader className="p-4 border-b border-border/60">
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" />
              Quick Search & Navigation
            </DialogTitle>
          </DialogHeader>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="p-4 border-b border-border/40">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Type a skill, candidate name, or job title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-11 text-sm bg-muted/30 focus-visible:ring-primary"
              />
            </div>
            {searchQuery.trim() && (
              <div className="mt-2.5 flex items-center gap-2">
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 text-xs bg-primary text-white"
                >
                  Search Candidates for &ldquo;{searchQuery}&rdquo;
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    setSearchOpen(false);
                    router.push(`/jobs?search=${encodeURIComponent(searchQuery.trim())}`);
                    setSearchQuery("");
                  }}
                >
                  Search Jobs
                </Button>
              </div>
            )}
          </form>

          {/* Quick Jump Shortcuts */}
          <div className="p-3 bg-muted/20">
            <p className="px-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Quick Shortcuts
            </p>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <Link
                href="/dashboard"
                onClick={() => setSearchOpen(false)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/60 transition-colors"
              >
                <LayoutDashboard className="h-3.5 w-3.5 text-primary" />
                <span>Dashboard Overview</span>
              </Link>
              <Link
                href="/jobs"
                onClick={() => setSearchOpen(false)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/60 transition-colors"
              >
                <Briefcase className="h-3.5 w-3.5 text-primary" />
                <span>Active Jobs</span>
              </Link>
              <Link
                href="/candidates"
                onClick={() => setSearchOpen(false)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/60 transition-colors"
              >
                <Users className="h-3.5 w-3.5 text-primary" />
                <span>Candidate Directory</span>
              </Link>
              <Link
                href="/interviews"
                onClick={() => setSearchOpen(false)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/60 transition-colors"
              >
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span>Interview Hub</span>
              </Link>
              {user?.role !== "hiring_manager" && (
                <Link
                  href="/jobs/new"
                  onClick={() => setSearchOpen(false)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/60 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5 text-primary" />
                  <span>Create Requisition</span>
                </Link>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
