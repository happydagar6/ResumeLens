// src/app/(dashboard)/interviews/page.jsx
"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { format, isToday, isPast, formatDistanceToNow } from "date-fns";
import {
  Calendar,
  Clock,
  Video,
  User,
  Briefcase,
  Search,
  CheckCircle2,
  RotateCcw,
  XCircle,
  ExternalLink,
  Sparkles,
  Phone,
  MapPin,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Copy,
  Check,
  CalendarCheck,
} from "lucide-react";

import {
  useUpcomingInterviews,
  useUpdateInterview,
  useCancelInterview,
} from "@/hooks/use-interview";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ── Visual Status Configuration ───────────────────────────────────────────────
const STATUS_CONFIG = {
  scheduled: {
    label: "Scheduled",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  },
  rescheduled: {
    label: "Rescheduled",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800 line-through opacity-75",
  },
};

// Platform Icon Helper
function MeetingPlatformIcon({ type, className }) {
  if (type === "phone") return <Phone className={className} />;
  if (type === "in_person") return <MapPin className={className} />;
  return <Video className={className} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN INTERVIEW HUB PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function InterviewsPage() {
  // ── 1. SERVER STATE (Data Fetching & Mutations via TanStack Query) ──────────
  const { interviews, isLoading, isError, refetch } = useUpcomingInterviews({
    timeframe: "all",
  });
  const updateMutation = useUpdateInterview();
  const cancelMutation = useCancelInterview();

  // ── 2. LOCAL UI STATE (Search, Filters, Active Tab, Modal Popups) ───────────
  const [searchQuery, setSearchQuery] = useState("");
  const [roundFilter, setRoundFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("today");

  // Reschedule Dialog state
  const [rescheduleItem, setRescheduleItem] = useState(null);
  const [newDate, setNewDate] = useState("");

  // Cancel Alert Dialog state
  const [cancelItem, setCancelItem] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  // Quick Copy Feedback state
  const [copiedId, setCopiedId] = useState(null);

  // ── 3. DERIVED STATE & IN-MEMORY FILTERING (using useMemo) ──────────────────
  // Derives filtered lists, partition tabs, and summary metrics in a single pass.
  // Only re-executes when interviews, searchQuery, or roundFilter change.
  const { today, upcoming, past, all, metrics } = useMemo(() => {
    const now = new Date();

    // Filter by Search Query & Round Type
    const filtered = interviews.filter((item) => {
      const candidate = item.resumeId?.candidateName?.toLowerCase() || "";
      const jobTitle = item.jobId?.title?.toLowerCase() || "";
      const interviewer = item.interviewer?.name?.toLowerCase() || "";
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch =
        !q ||
        candidate.includes(q) ||
        jobTitle.includes(q) ||
        interviewer.includes(q);

      const matchesRound =
        roundFilter === "all" || item.roundType === roundFilter;

      return matchesSearch && matchesRound;
    });

    // Partition into Today, Upcoming, and Past
    const todayList = [];
    const upcomingList = [];
    const pastList = [];

    filtered.forEach((item) => {
      const itemDate = new Date(item.scheduledAt);
      const isCompletedOrCancelled =
        item.status === "completed" || item.status === "cancelled";

      if (isCompletedOrCancelled) {
        pastList.push(item);
      } else if (isToday(itemDate)) {
        todayList.push(item);
      } else if (itemDate > now) {
        upcomingList.push(item);
      } else {
        pastList.push(item);
      }
    });

    // Compute top KPI summary numbers from raw data
    let todayCount = 0;
    let upcomingCount = 0;
    let completedCount = 0;

    interviews.forEach((item) => {
      const d = new Date(item.scheduledAt);
      if (item.status === "completed") completedCount++;
      else if (isToday(d) && item.status !== "cancelled") todayCount++;
      else if (d > now && item.status !== "cancelled") upcomingCount++;
    });

    return {
      today: todayList,
      upcoming: upcomingList,
      past: pastList,
      all: filtered,
      metrics: {
        todayCount,
        upcomingCount,
        completedCount,
        total: interviews.length,
      },
    };
  }, [interviews, searchQuery, roundFilter]);

  // ── 4. ACTION HANDLERS (using useCallback for performance stability) ────────

  // Mark Interview Completed
  const handleMarkCompleted = useCallback(
    async (interview) => {
      try {
        await updateMutation.mutateAsync({
          id: interview._id,
          resumeId: interview.resumeId?._id || interview.resumeId,
          status: "completed",
        });
      } catch (err) {
        console.error("Failed to complete interview:", err);
      }
    },
    [updateMutation],
  );

  // Reschedule Form Submit
  const handleRescheduleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!rescheduleItem || !newDate) return;

      try {
        await updateMutation.mutateAsync({
          id: rescheduleItem._id,
          resumeId: rescheduleItem.resumeId?._id || rescheduleItem.resumeId,
          scheduledAt: new Date(newDate).toISOString(),
        });
        setRescheduleItem(null);
        setNewDate("");
      } catch (err) {
        console.error("Failed to reschedule interview:", err);
      }
    },
    [rescheduleItem, newDate, updateMutation],
  );

  // Cancellation Confirm
  const handleCancelSubmit = useCallback(async () => {
    if (!cancelItem) return;

    try {
      await cancelMutation.mutateAsync({
        id: cancelItem._id,
        resumeId: cancelItem.resumeId?._id || cancelItem.resumeId,
        reason: cancelReason.trim() || "Cancelled by recruiter",
      });
      setCancelItem(null);
      setCancelReason("");
    } catch (err) {
      console.error("Failed to cancel interview:", err);
    }
  }, [cancelItem, cancelReason, cancelMutation]);

  // Copy Meeting Link to Clipboard
  const handleCopyLink = useCallback((link, id) => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // Determine which list to render for the active tab
  const activeList =
    activeTab === "today"
      ? today
      : activeTab === "upcoming"
      ? upcoming
      : activeTab === "past"
      ? past
      : all;

  // ── 5. RENDER UI ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── HEADER TITLE BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Interview Schedule</h1>
            <Badge variant="outline" className="text-xs font-mono">
              Central Hub
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Track, join, and manage candidate interview rounds across your requisitions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {/* Quick link to candidates to schedule new rounds */}
          <Button asChild size="sm" className="gap-1.5 text-xs">
            <Link href="/candidates">
              <Sparkles className="w-3.5 h-3.5" />
              Schedule New Round
            </Link>
          </Button>
        </div>
      </div>

      {/* ── TOP KPI METRICS SUMMARY ROW ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Today */}
        <Card className="border-muted/70 shadow-xs relative overflow-hidden">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Today&apos;s Schedule</span>
              {metrics.todayCount > 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">{metrics.todayCount}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {metrics.todayCount === 1 ? "Session scheduled today" : "Sessions scheduled today"}
            </p>
          </CardContent>
        </Card>

        {/* Metric 2: Upcoming Pipeline */}
        <Card className="border-muted/70 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <span className="text-xs font-medium text-muted-foreground">Upcoming Pipeline</span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {metrics.upcomingCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Future confirmed rounds</p>
          </CardContent>
        </Card>

        {/* Metric 3: Completed */}
        <Card className="border-muted/70 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <span className="text-xs font-medium text-muted-foreground">Completed Rounds</span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {metrics.completedCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Evaluations finished</p>
          </CardContent>
        </Card>

        {/* Metric 4: Total Managed */}
        <Card className="border-muted/70 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <span className="text-xs font-medium text-muted-foreground">Total Managed</span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">{metrics.total}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">All tracked sessions</p>
          </CardContent>
        </Card>
      </div>

      {/* ── FILTER & SEARCH TOOLBAR ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search candidate name, job title, or interviewer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-sm h-10"
          />
        </div>

        {/* Round Type Filter Dropdown */}
        <div className="flex items-center gap-2">
          <select
            value={roundFilter}
            onChange={(e) => setRoundFilter(e.target.value)}
            className="h-10 px-3 text-sm bg-background border border-input rounded-md text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Round Types</option>
            <option value="screening">Screening</option>
            <option value="technical">Technical</option>
            <option value="system_design">System Design</option>
            <option value="behavioral">Behavioral</option>
            <option value="hiring_manager">Hiring Manager</option>
            <option value="culture_fit">Culture Fit</option>
            <option value="final">Final Round</option>
          </select>
        </div>
      </div>

      {/* ── TABS NAVIGATION WITH LIVE COUNTERS ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-full sm:w-[480px]">
          <TabsTrigger value="today" className="gap-1.5 text-xs">
            Today
            <span className="ml-1 rounded-full px-1.5 py-0.2 bg-muted text-[10px] font-semibold">
              {today.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="gap-1.5 text-xs">
            Upcoming
            <span className="ml-1 rounded-full px-1.5 py-0.2 bg-muted text-[10px] font-semibold">
              {upcoming.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="past" className="gap-1.5 text-xs">
            Past
            <span className="ml-1 rounded-full px-1.5 py-0.2 bg-muted text-[10px] font-semibold">
              {past.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-1.5 text-xs">
            All
            <span className="ml-1 rounded-full px-1.5 py-0.2 bg-muted text-[10px] font-semibold">
              {all.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* ── INTERVIEWS LIST CONTENT ── */}
        <div className="mt-4">
          {isLoading ? (
            // Loading skeleton
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-muted/40 animate-pulse rounded-xl border border-muted" />
              ))}
            </div>
          ) : isError ? (
            // Error State
            <div className="py-12 text-center border border-dashed rounded-xl bg-muted/20">
              <AlertTriangle className="w-10 h-10 mx-auto text-rose-500 mb-2" />
              <h3 className="font-semibold text-base">Failed to load interviews</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Unable to retrieve interview rounds. Please try refreshing.
              </p>
              <Button size="sm" variant="outline" onClick={() => refetch()} className="mt-4 text-xs">
                Retry
              </Button>
            </div>
          ) : activeList.length === 0 ? (
            // Empty State
            <div className="py-12 text-center border border-dashed rounded-xl bg-muted/20">
              <Calendar className="w-10 h-10 mx-auto text-muted-foreground/60 mb-2" />
              <h3 className="font-semibold text-base text-foreground">
                No interviews found
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {searchQuery || roundFilter !== "all"
                  ? "No interview rounds match your active filter criteria."
                  : activeTab === "today"
                  ? "No interview sessions scheduled for today."
                  : "No interview rounds in this category."}
              </p>
            </div>
          ) : (
            // Render Cards
            <div className="space-y-3">
              {activeList.map((interview) => {
                const statusConfig =
                  STATUS_CONFIG[interview.status] || STATUS_CONFIG.scheduled;
                const interviewDate = new Date(interview.scheduledAt);
                const isPastMeeting = isPast(interviewDate);
                const isActive =
                  interview.status === "scheduled" ||
                  interview.status === "rescheduled";

                return (
                  <Card
                    key={interview._id}
                    className={`transition-all hover:border-blue-400/50 shadow-xs ${
                      interview.status === "cancelled"
                        ? "opacity-75 bg-muted/20"
                        : "bg-card"
                    }`}
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* ── LEFT SECTION: Candidate, Job, Round Title & Badges ── */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-base text-foreground truncate">
                              {interview.resumeId?.candidateName || "Candidate"}
                            </h3>
                            <Badge
                              variant="outline"
                              className={`text-xs px-2 py-0.5 border ${statusConfig.className}`}
                            >
                              {statusConfig.label}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className="text-xs uppercase font-mono tracking-wider"
                            >
                              {interview.roundType?.replace("_", " ")}
                            </Badge>
                          </div>

                          {/* Candidate Email & Requisition */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {interview.resumeId?.candidateEmail && (
                              <span>{interview.resumeId.candidateEmail}</span>
                            )}
                            <span className="hidden sm:inline">•</span>
                            <div className="flex items-center gap-1 font-medium text-foreground/80">
                              <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                              <span>{interview.jobId?.title || "Role Requisition"}</span>
                              {interview.jobId?.company && (
                                <span className="text-muted-foreground font-normal">
                                  at {interview.jobId.company}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Round Title & Notes */}
                          <p className="text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">Round: </span>
                            {interview.title}
                            {interview.notes && (
                              <span className="italic text-muted-foreground/90 ml-1">
                                — &quot;{interview.notes}&quot;
                              </span>
                            )}
                          </p>
                        </div>

                        {/* ── MIDDLE SECTION: Time, Duration, Interviewer ── */}
                        <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 text-xs border-y lg:border-y-0 lg:border-x lg:px-4 py-3 lg:py-0 shrink-0">
                          {/* Date & Time */}
                          <div className="flex items-start gap-2">
                            <Clock className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold text-foreground">
                                {format(interviewDate, "EEE, MMM d, yyyy")}
                              </p>
                              <p className="text-muted-foreground">
                                {format(interviewDate, "h:mm a")} ({interview.duration} mins)
                              </p>
                              {isActive && (
                                <span
                                  className={`inline-block text-[11px] font-medium ${
                                    isPastMeeting
                                      ? "text-amber-600 dark:text-amber-400"
                                      : "text-blue-600 dark:text-blue-400"
                                  }`}
                                >
                                  {isPastMeeting
                                    ? "Occurred recently"
                                    : formatDistanceToNow(interviewDate, { addSuffix: true })}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Interviewer Details */}
                          <div className="flex items-start gap-2">
                            <User className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">
                                {interview.interviewer?.name || "Assigned Interviewer"}
                              </p>
                              <p className="text-muted-foreground text-[11px] capitalize truncate">
                                {interview.interviewer?.role?.replace("_", " ") || "Team Member"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* ── RIGHT SECTION: Action Buttons & Join Meeting ── */}
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 self-start lg:self-center shrink-0">
                          {/* 1-Click Join Link */}
                          {interview.meetingLink ? (
                            <div className="flex items-center gap-1">
                              <Button
                                asChild
                                size="sm"
                                className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                <a
                                  href={
                                    interview.meetingLink.startsWith("http")
                                      ? interview.meetingLink
                                      : `https://${interview.meetingLink}`
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <MeetingPlatformIcon
                                    type={interview.meetingType}
                                    className="w-3.5 h-3.5"
                                  />
                                  <span>Join Call</span>
                                  <ExternalLink className="w-3 h-3 ml-0.5" />
                                </a>
                              </Button>

                              {/* Copy Link Button */}
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                title="Copy meeting link"
                                onClick={() => handleCopyLink(interview.meetingLink, interview._id)}
                              >
                                {copiedId === interview._id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                                )}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic px-2">
                              No link specified
                            </span>
                          )}

                          {/* Mark Complete, Reschedule, Cancel actions */}
                          {isActive && (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkCompleted(interview)}
                                disabled={updateMutation.isPending}
                                className="h-8 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                title="Mark interview round as completed"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Complete</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setRescheduleItem(interview);
                                  setNewDate(
                                    interview.scheduledAt
                                      ? new Date(interview.scheduledAt).toISOString().slice(0, 16)
                                      : ""
                                  );
                                }}
                                disabled={updateMutation.isPending}
                                className="h-8 text-xs gap-1"
                                title="Reschedule session"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Reschedule</span>
                              </Button>

                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setCancelItem(interview);
                                  setCancelReason("");
                                }}
                                disabled={cancelMutation.isPending}
                                className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                title="Cancel interview"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </Tabs>

      {/* ── RESCHEDULE DIALOG MODAL ── */}
      <Dialog
        open={Boolean(rescheduleItem)}
        onOpenChange={(open) => !open && setRescheduleItem(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Interview</DialogTitle>
            <DialogDescription className="text-xs">
              Pick a new date and time for {rescheduleItem?.title} with{" "}
              {rescheduleItem?.resumeId?.candidateName || "the candidate"}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRescheduleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="rescheduleDate" className="text-xs font-semibold">
                New Date & Time *
              </Label>
              <Input
                id="rescheduleDate"
                type="datetime-local"
                min={new Date().toISOString().slice(0, 16)}
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                required
                className="h-9 text-sm"
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRescheduleItem(null)}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Confirm Reschedule"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── CANCEL CONFIRMATION ALERT DIALOG ── */}
      <AlertDialog
        open={Boolean(cancelItem)}
        onOpenChange={(open) => !open && setCancelItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Interview Round?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to cancel {cancelItem?.title} for{" "}
              {cancelItem?.resumeId?.candidateName}? This action will mark the status as
              cancelled and log the event.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-2 space-y-1.5">
            <Label htmlFor="cancelReasonInput" className="text-xs font-semibold">
              Cancellation Reason (Optional)
            </Label>
            <Textarea
              id="cancelReasonInput"
              rows={2}
              placeholder="e.g. Candidate withdrew, position filled, conflicting schedule..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="text-xs resize-none"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMutation.isPending}>
              Keep Interview
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubmit}
              disabled={cancelMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {cancelMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Yes, Cancel Interview"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
