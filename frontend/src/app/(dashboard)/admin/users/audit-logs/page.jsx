// src/app/(dashboard)/admin/users/audit-logs/page.jsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useAdminAuditLogs } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldAlert,
  Users,
  History,
  UserCog,
  UserX,
  UserCheck,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Globe,
} from "lucide-react";

// ── Action badge and styling configuration ──────────────────────────────────
const ACTION_CONFIG = {
  USER_ROLE_CHANGED: {
    label: "Role Changed",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300/40",
    icon: UserCog,
  },
  USER_DEACTIVATED: {
    label: "User Deactivated",
    color: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-300/40",
    icon: UserX,
  },
  USER_REACTIVATED: {
    label: "User Reactivated",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300/40",
    icon: UserCheck,
  },
  DEFAULT: {
    label: "System Event",
    color: "bg-secondary text-secondary-foreground border-border/60",
    icon: History,
  },
};

// ── Timestamp formatter helper ──────────────────────────────────────────────
function formatTimestamp(isoString) {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return isoString;
  }
}

export default function AdminAuditLogsPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Guard: Only organization admins can view security audit logs
  useEffect(() => {
    if (user && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  // ── Filters & Pagination State ────────────────────────────────────────────
  const [actionFilter, setActionFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { logs, pagination, isLoading, isError, refetch } = useAdminAuditLogs({
    page,
    limit: 15,
    action: actionFilter,
  });

  const handleActionChange = (val) => {
    setActionFilter(val);
    setPage(1); // Reset to page 1 whenever filter changes
  };

  if (!user || user.role !== "admin") return null;

  return (
    <div className="space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Admin Console
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage organization members, role permissions, and compliance audit trail.
            </p>
          </div>
        </div>

        {/* Live Refresh Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
          className="h-9 gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh Logs
        </Button>
      </div>

      {/* ── Sub-Navigation Tabs ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-muted-foreground hover:text-foreground hover:bg-muted/50 gap-2 h-9"
        >
          <Link href="/admin/users">
            <Users className="h-4 w-4" />
            Team Members
          </Link>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="font-medium bg-muted text-foreground gap-2 h-9 shadow-sm"
        >
          <History className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          Security Audit Trail
          {pagination?.total > 0 && (
            <Badge
              variant="outline"
              className="ml-1 px-1.5 py-0 text-[11px] font-mono bg-background"
            >
              {pagination.total}
            </Badge>
          )}
        </Button>
      </div>

      {/* ── Filter Bar ───────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Select value={actionFilter} onValueChange={handleActionChange}>
            <SelectTrigger className="w-56 h-9 text-xs">
              <SelectValue placeholder="All Audit Events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="USER_ROLE_CHANGED">Role Changes</SelectItem>
              <SelectItem value="USER_DEACTIVATED">User Deactivations</SelectItem>
              <SelectItem value="USER_REACTIVATED">User Reactivations</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {pagination && (
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{logs.length}</span> of{" "}
            <span className="font-medium text-foreground">{pagination.total}</span> events
          </p>
        )}
      </div>

      {/* ── Audit Logs Table ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 text-xs">
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead className="w-[180px]">Action</TableHead>
              <TableHead>Performed By (Actor)</TableHead>
              <TableHead>Target / Subject</TableHead>
              <TableHead>Change Details</TableHead>
              <TableHead className="text-right">IP Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Loading State */}
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-32 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-44" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))}

            {/* Error State */}
            {!isLoading && isError && (
              <TableRow>
                <TableCell colSpan={6} className="h-36 text-center text-rose-500">
                  Failed to load audit logs. Please try refreshing.
                </TableCell>
              </TableRow>
            )}

            {/* Empty State */}
            {!isLoading && !isError && logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <ShieldCheck className="h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm font-medium">No audit events recorded yet</p>
                    <p className="text-xs">
                      Administrative actions like role modifications or user deactivations will automatically appear here.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {/* Render Log Entries */}
            {!isLoading &&
              !isError &&
              logs.map((log) => {
                const conf = ACTION_CONFIG[log.action] || ACTION_CONFIG.DEFAULT;
                const IconComponent = conf.icon;

                return (
                  <TableRow key={log._id} className="text-xs hover:bg-muted/20 transition-colors">
                    {/* Timestamp */}
                    <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                      {formatTimestamp(log.createdAt)}
                    </TableCell>

                    {/* Action Badge */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`gap-1.5 py-0.5 px-2 text-[11px] font-medium border ${conf.color}`}
                      >
                        <IconComponent className="h-3 w-3" />
                        {conf.label}
                      </Badge>
                    </TableCell>

                    {/* Performed By (Actor) */}
                    <TableCell>
                      {log.performedBy ? (
                        <div>
                          <p className="font-medium text-foreground">{log.performedBy.name}</p>
                          <p className="text-[11px] text-muted-foreground">{log.performedBy.email}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">System Automated</span>
                      )}
                    </TableCell>

                    {/* Target User */}
                    <TableCell>
                      {log.targetUser || log.metadata?.targetUserName ? (
                        <div>
                          <p className="font-medium text-foreground">
                            {log.targetUser?.name || log.metadata?.targetUserName}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {log.targetUser?.email || log.metadata?.targetUserEmail}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Change Details */}
                    <TableCell>
                      {log.action === "USER_ROLE_CHANGED" ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">Role:</span>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0">
                            {log.metadata?.oldRole || "none"}
                          </Badge>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0 font-semibold border-violet-500/40 text-violet-600 dark:text-violet-400">
                            {log.metadata?.newRole}
                          </Badge>
                        </div>
                      ) : log.action === "USER_DEACTIVATED" ? (
                        <span className="text-rose-600 dark:text-rose-400 font-medium">
                          Account soft-deactivated
                        </span>
                      ) : log.action === "USER_REACTIVATED" ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Account reactivated & restored
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-mono text-[11px]">
                          {log.metadata ? JSON.stringify(log.metadata) : "—"}
                        </span>
                      )}
                    </TableCell>

                    {/* IP Address */}
                    <TableCell className="text-right">
                      {log.ipAddress ? (
                        <Badge
                          variant="secondary"
                          className="font-mono text-[10px] gap-1 px-1.5 py-0 text-muted-foreground"
                        >
                          <Globe className="h-2.5 w-2.5" />
                          {log.ipAddress}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination Controls ───────────────────────────────────────────── */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between border-t border-border/60 pt-4">
          <p className="text-xs text-muted-foreground">
            Page <span className="font-medium text-foreground">{pagination.page}</span> of{" "}
            <span className="font-medium text-foreground">{pagination.pages}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 gap-1 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.pages || isLoading}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 gap-1 text-xs"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

