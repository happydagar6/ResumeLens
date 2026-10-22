// src/app/(dashboard)/admin/users/page.jsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useAdminUsers,
  useUpdateUserRole,
  useDeactivateUser,
  useReactivateUser,
} from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronLeft, ChevronRight, ShieldAlert, Users, History } from "lucide-react";

// ── Role badge colors ─────────────────────────────────────────────────────────
const ROLE_COLORS = {
  admin:
    "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  recruiter: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  hiring_manager:
    "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
};

const ROLE_LABELS = {
  admin: "Admin",
  recruiter: "Recruiter",
  hiring_manager: "Hiring Manager",
};

export default function AdminUsersPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Guard: only admins can access this page
  useEffect(() => {
    if (user && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 400);

  // Reset to page 1 when filters change
  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
  };
  const handleRoleFilterChange = (value) => {
    setRoleFilter(value);
    setPage(1);
  };

  // ── Data ──────────────────────────────────────────────────────────────────
  const { users, pagination, isLoading } = useAdminUsers({
    page,
    limit: 15,
    search: debouncedSearch,
    role: roleFilter,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const updateRole = useUpdateUserRole();
  const deactivate = useDeactivateUser();
  const reactivate = useReactivateUser();

  if (!user || user.role !== "admin") return null; // Prevent flash of content

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
          <ShieldAlert className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage roles and access for everyone in your organization.
          </p>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <Button
          variant="secondary"
          size="sm"
          className="font-medium bg-muted text-foreground gap-2 h-9 shadow-sm"
        >
          <Users className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          Team Members
        </Button>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-muted-foreground hover:text-foreground hover:bg-muted/50 gap-2 h-9"
        >
          <Link href="/admin/users/audit-logs">
            <History className="h-4 w-4" />
            Security Audit Trail
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="recruiter">Recruiter</SelectItem>
            <SelectItem value="hiring_manager">Hiring Manager</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        {pagination && (
          <p className="text-sm text-muted-foreground whitespace-nowrap">
            {pagination.total} user{pagination.total !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/60 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Jobs Created</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton rows
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-10 text-muted-foreground"
                >
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => {
                const isSelf = u._id === user.id;
                return (
                  <TableRow
                    key={u._id}
                    className={u.isDeactivated ? "opacity-50" : ""}
                  >
                    {/* Name */}
                    <TableCell className="font-medium">
                      {u.name}
                      {isSelf && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (you)
                        </span>
                      )}
                    </TableCell>

                    {/* Email */}
                    <TableCell className="text-muted-foreground text-sm">
                      {u.email}
                    </TableCell>

                    {/* Role — inline dropdown (disabled for self) */}
                    <TableCell>
                      <Select
                        value={u.role}
                        disabled={isSelf || updateRole.isPending}
                        onValueChange={(newRole) =>
                          updateRole.mutate({ userId: u._id, role: newRole })
                        }
                      >
                        <SelectTrigger className="h-7 w-36 text-xs border-0 px-2 bg-transparent focus:ring-0">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[u.role]}`}
                          >
                            {ROLE_LABELS[u.role] ?? u.role}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="recruiter">Recruiter</SelectItem>
                          <SelectItem value="hiring_manager">
                            Hiring Manager
                          </SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* Job count */}
                    <TableCell className="text-sm text-muted-foreground">
                      {u.jobCount ?? 0}
                    </TableCell>

                    {/* Join date */}
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </TableCell>

                    {/* Status badge */}
                    <TableCell>
                      {u.isDeactivated ? (
                        <Badge
                          variant="outline"
                          className="text-red-600 border-red-300 dark:border-red-800 text-xs"
                        >
                          Deactivated
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-green-600 border-green-300 dark:border-green-800 text-xs"
                        >
                          Active
                        </Badge>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      {!isSelf &&
                        (u.isDeactivated ? (
                          // Reactivate button
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={reactivate.isPending}
                            onClick={() => reactivate.mutate(u._id)}
                            className="text-green-600 border-green-300 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-950/30 text-xs"
                          >
                            Reactivate
                          </Button>
                        ) : (
                          // Deactivate with confirmation dialog
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive border-destructive/30 hover:bg-destructive/5 text-xs"
                                disabled={deactivate.isPending}
                              >
                                Deactivate
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Deactivate {u.name}?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This user will no longer be able to log in.
                                  Their jobs, resumes, and screenings will
                                  remain intact. You can reactivate them at any
                                  time.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deactivate.mutate(u._id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Deactivate
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ))}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {pagination.page} of {pagination.pages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === pagination.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
