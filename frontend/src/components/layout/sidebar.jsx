"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Briefcase, Plus, Settings, Sparkles, ShieldAlert, Users } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";

function NavLinks({ onClick }) {
  const pathname = usePathname();
  const { canCreateJob, isHiringManager, isAdmin } = usePermissions();

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true, show: true },
    {
      href: "/jobs",
      label: isHiringManager ? "Assigned Jobs" : "Jobs",
      icon: Briefcase,
      exact: false,
      show: true,
    },
    { href: "/jobs/new", label: "New Job", icon: Plus, exact: true, show: canCreateJob },
    { href: "/settings", label: "Settings", icon: Settings, exact: false, show: true },
  ];

  // Admin-only links rendered in a separate section below
  const adminLinks = [
    { href: "/admin/users", label: "User Management", icon: Users, exact: false, show: isAdmin },
  ];

  const renderLink = (link) => {
    const isActive = link.exact
      ? pathname === link.href
      : pathname === link.href ||
        (pathname.startsWith(link.href + "/") && link.href !== "/jobs/new");

    return (
      <Link
        key={link.href}
        href={link.href}
        onClick={onClick}
        className={cn(
          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-linear-to-r from-primary/90 to-primary text-primary-foreground shadow-md shadow-primary/30"
            : "text-muted-foreground hover:text-foreground hover:bg-primary/8 hover:translate-x-0.5"
        )}
      >
        <link.icon className={cn(
          "h-4 w-4 transition-all duration-200",
          isActive ? "text-primary-foreground" : "group-hover:text-primary"
        )} />
        {link.label}
        {isActive && (
          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-foreground/70" />
        )}
      </Link>
    );
  };

  const visibleAdminLinks = adminLinks.filter((l) => l.show);

  return (
    <>
      {links.filter((link) => link.show).map(renderLink)}

      {/* Admin section — only visible to admin users */}
      {visibleAdminLinks.length > 0 && (
        <>
          <div className="mt-4 mb-2 flex items-center gap-2 px-3">
            <ShieldAlert className="h-3.5 w-3.5 text-violet-500" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-violet-500">
              Admin
            </span>
            <div className="flex-1 h-px bg-violet-500/20" />
          </div>
          {visibleAdminLinks.map(renderLink)}
        </>
      )}
    </>
  );
}

export default function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border/60 bg-linear-to-b from-background to-muted/20 md:block">
      {/* Brand strip */}
      <div className="px-4 pt-5 pb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-primary to-violet-600 shadow-md shadow-primary/40">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-bold gradient-brand">ResumeLens</span>
      </div>
      <div className="mx-4 mb-4 h-px bg-linear-to-r from-transparent via-border to-transparent" />
      <nav className="flex flex-col gap-1 px-3 pb-4">
        <NavLinks />
      </nav>
    </aside>
  );
}

export function MobileSidebar({ onClose }) {
  return (
    <div className="bg-linear-to-b from-background to-muted/20 min-h-full">
      <div className="px-4 pt-5 pb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-primary to-violet-600 shadow-md shadow-primary/40">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-bold gradient-brand">ResumeLens</span>
      </div>
      <div className="mx-4 mb-4 h-px bg-linear-to-r from-transparent via-border to-transparent" />
      <nav className="flex flex-col gap-1 px-3 pb-4">
        <NavLinks onClick={onClose} />
      </nav>
    </div>
  );
}