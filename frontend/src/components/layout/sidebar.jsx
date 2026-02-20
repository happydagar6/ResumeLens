"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Briefcase, Plus } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";

function NavLinks({ onClick }) {
  const pathname = usePathname();
  const { canCreateJob, isHiringManager } = usePermissions();

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
  ];

  return links
    .filter((link) => link.show)
    .map((link) => {
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
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            isActive
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <link.icon className="h-4 w-4" />
          {link.label}
        </Link>
      );
    });
}

export default function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r bg-muted/20 md:block">
      <nav className="flex flex-col gap-1 p-4">
        <NavLinks />
      </nav>
    </aside>
  );
}

export function MobileSidebar({ onClose }) {
  return (
    <nav className="flex flex-col gap-1 p-4">
      <NavLinks onClick={onClose} />
    </nav>
  );
}