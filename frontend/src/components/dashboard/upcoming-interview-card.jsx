// src/components/dashboard/upcoming-interview-card.jsx
"use client";

import { useState } from "react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import {
  Calendar,
  Clock,
  Video,
  User,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ExternalLink,
  AlertTriangle,
  Loader2,
  FileText,
  MapPin,
  Phone,
  CalendarCheck,
} from "lucide-react";
import {
  useCandidateInterviews,
  useUpdateInterview,
  useCancelInterview,
} from "@/hooks/use-interview";
import ScheduleInterviewDialog from "./schedule-interview-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";

// Visual badge styling configuration for different interview statuses
const STATUS_CONFIG = {
  scheduled: {
    label: "Scheduled",
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  },
  rescheduled: {
    label: "Rescheduled",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  completed: {
    label: "Completed",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800 line-through opacity-75",
  },
};

// Platform icon component defined at the top level
function MeetingPlatformIcon({ type, className }) {
  if (type === "phone") return <Phone className={className} />;
  if (type === "in_person") return <MapPin className={className} />;
  return <Video className={className} />;
}

/**
 * CandidateInterviewsSection (Main Parent Container)
 * 
 * @param {string} resumeId - Candidate resume MongoDB ID
 * @param {string} candidateName - Name of the candidate
 * @param {string} candidateEmail - Email of the candidate
 * @param {string} jobTitle - Job requisition title
 */
export default function CandidateInterviewsSection({
  resumeId,
  candidateName = "Candidate",
  candidateEmail = "",
  jobTitle = "Role",
}) {
  // 1. Fetch candidate interview rounds from our React Query Hook
  const { interviews, isLoading } = useCandidateInterviews(resumeId);

  // 2. Loading State: Render a pulse placeholder while the API request is in-flight
  if (isLoading) {
    return (
      <Card className="shadow-xs border-muted/70">
        <CardHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="h-5 w-40 bg-muted animate-pulse rounded" />
            <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            <div className="h-20 bg-muted/50 animate-pulse rounded-lg" />
            <div className="h-20 bg-muted/50 animate-pulse rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // 3. Loaded State: Render Card with Header and Content Body
  return (
    <Card className="shadow-xs border-muted/70">
      {/* ── TOP HEADER BAR ── */}
      <CardHeader className="py-3.5 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <CardTitle className="text-base font-semibold">
              Interview Rounds
            </CardTitle>
            {/* Show total count badge if there are interviews */}
            {interviews.length > 0 && (
              <Badge variant="outline" className="text-xs font-normal">
                {interviews.length}{" "}
                {interviews.length === 1 ? "round" : "rounds"}
              </Badge>
            )}
          </div>

          {/* Schedule button in the top right corner */}
          <ScheduleInterviewDialog
            resumeId={resumeId}
            candidateName={candidateName}
            candidateEmail={candidateEmail}
            jobTitle={jobTitle}
          />
        </div>
      </CardHeader>

      {/* ── MAIN BODY CONTENT ── */}
      <CardContent className="p-4 space-y-3">
        {interviews.length === 0 ? (
          // Empty state: when no interviews exist yet
          <div className="py-8 text-center border border-dashed rounded-lg bg-muted/20">
            <Calendar className="w-9 h-9 mx-auto text-muted-foreground/60 mb-2" />
            <h4 className="text-sm font-semibold text-foreground">
              No interview rounds scheduled yet
            </h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Schedule technical evaluations, hiring manager screenings, or
              behavioral rounds with automated candidate invitations.
            </p>
          </div>
        ) : (
          // List of interview rounds
          interviews.map((interview) => (
            <InterviewCard
              key={interview._id}
              interview={interview}
              resumeId={resumeId}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

/**
 * InterviewCard (Individual Round Item Component)
 * 
 * @param {Object} interview - The interview document from MongoDB
 * @param {string} resumeId - Candidate resume MongoDB ID
 */
export function InterviewCard({ interview, resumeId }) {
  // 1. React Query Mutations for updating and cancelling
  const updateMutation = useUpdateInterview();
  const cancelMutation = useCancelInterview();

  // 2. Local states to control dialog popups
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  // 3. Computed display variables
  const statusConfig =
    STATUS_CONFIG[interview.status] || STATUS_CONFIG.scheduled;
  const interviewDate = new Date(interview.scheduledAt);
  const isPastMeeting = isPast(interviewDate);
  const isActive =
    interview.status === "scheduled" || interview.status === "rescheduled";

  // ── ACTION HANDLERS ──

  // Mark Completed Handler
  const handleMarkCompleted = async () => {
    try {
      await updateMutation.mutateAsync({
        id: interview._id,
        resumeId,
        status: "completed",
      });
      toast.success("Interview marked as completed");
    } catch {
      // Error handled by useUpdateInterview hook
    }
  };

  // Submit Reschedule Handler
  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!newDate) {
      toast.error("Please pick a new date and time");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: interview._id,
        resumeId,
        scheduledAt: new Date(newDate).toISOString(),
      });
      setIsRescheduleOpen(false);
      setNewDate("");
    } catch {
      // Error handled by hook
    }
  };

  // Confirm Cancellation Handler
  const handleCancelConfirm = async () => {
    try {
      await cancelMutation.mutateAsync({
        id: interview._id,
        resumeId,
        reason: cancelReason.trim() || "Cancelled by recruiter",
      });
      setIsCancelAlertOpen(false);
      setCancelReason("");
    } catch {
      // Error handled by hook
    }
  };

  return (
    <div
      className={`p-4 rounded-xl border transition-all ${
        interview.status === "cancelled"
          ? "bg-muted/30 border-muted opacity-80"
          : "bg-card border-border hover:border-blue-300 dark:hover:border-blue-900 shadow-xs"
      }`}
    >
      {/* ── CARD TOP ROW: Title, Badges, and Action Buttons ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-sm text-foreground">
            {interview.title}
          </h3>
          {/* Status Badge (Scheduled / Rescheduled / Completed / Cancelled) */}
          <Badge
            variant="outline"
            className={`text-xs px-2 py-0.5 border ${statusConfig.className}`}
          >
            {statusConfig.label}
          </Badge>
          {/* Round Type (technical, behavioral, etc.) */}
          <Badge
            variant="secondary"
            className="text-xs uppercase font-mono tracking-wider"
          >
            {interview.roundType?.replace("_", " ")}
          </Badge>
        </div>

        {/* Action Controls for Active Rounds */}
        {isActive && (
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            {/* Mark Completed Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleMarkCompleted}
              disabled={updateMutation.isPending}
              className="h-8 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              title="Mark round as completed"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Complete
            </Button>

            {/* Reschedule Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsRescheduleOpen(true)}
              disabled={updateMutation.isPending}
              className="h-8 text-xs gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reschedule
            </Button>

            {/* Cancel Button */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsCancelAlertOpen(true)}
              disabled={cancelMutation.isPending}
              className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* ── CARD MIDDLE GRID: Date/Time, Interviewer, Platform ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        {/* 1. Date & Time */}
        <div className="flex items-start gap-2">
          <Clock className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">
              {format(interviewDate, "EEE, MMM d, yyyy")}
            </p>
            <p className="text-muted-foreground">
              {format(interviewDate, "h:mm a")} ({interview.duration} mins)
            </p>
            {isActive && (
              <span
                className={`inline-block mt-0.5 text-[11px] font-medium ${
                  isPastMeeting
                    ? "text-amber-600"
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

        {/* 2. Interviewer Details */}
        <div className="flex items-start gap-2">
          <User className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">
              {interview.interviewer?.name || "Assigned Interviewer"}
            </p>
            <p className="text-muted-foreground">
              {interview.interviewer?.role?.replace("_", " ") || "Team Member"}
            </p>
            {interview.interviewer?.email && (
              <p className="text-muted-foreground text-[11px] truncate">
                {interview.interviewer.email}
              </p>
            )}
          </div>
        </div>

        {/* 3. Meeting Platform & 1-Click Join Link */}
        <div className="flex items-start gap-2">
          <MeetingPlatformIcon
            type={interview.meetingType}
            className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground capitalize">
              {interview.meetingType?.replace("_", " ")}
            </p>
            {interview.meetingLink ? (
              <a
                href={
                  interview.meetingLink.startsWith("http")
                    ? interview.meetingLink
                    : `https://${interview.meetingLink}`
                }
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline mt-1 font-medium truncate max-w-full"
              >
                <span>Join Meeting</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <p className="text-muted-foreground text-[11px]">Link not specified</p>
            )}
          </div>
        </div>
      </div>

      {/* ── INTERNAL PRIVATE NOTES (Hidden from candidate) ── */}
      {interview.notes && (
        <div className="mt-3 pt-2.5 border-t flex items-start gap-2 text-xs bg-muted/30 p-2 rounded-md">
          <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-muted-foreground">Internal Note: </span>
            <span className="text-foreground/90">{interview.notes}</span>
          </div>
        </div>
      )}

      {/* ── CANCELLATION REASON (Shows only if cancelled) ── */}
      {interview.status === "cancelled" && interview.cancellationReason && (
        <div className="mt-3 pt-2 border-t flex items-center gap-2 text-xs text-rose-700 dark:text-rose-400">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Reason: {interview.cancellationReason}</span>
        </div>
      )}

      {/* ── RESCHEDULE DIALOG MODAL ── */}
      <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Interview</DialogTitle>
            <DialogDescription className="text-xs">
              Pick a new date and time for {interview.title}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRescheduleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="newDate" className="text-xs font-semibold">
                New Date & Time *
              </Label>
              <Input
                id="newDate"
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
                onClick={() => setIsRescheduleOpen(false)}
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
      <AlertDialog open={isCancelAlertOpen} onOpenChange={setIsCancelAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Interview Round?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to cancel this interview? This action will update the status to cancelled and log the cancellation in the candidate timeline.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-2 space-y-1.5">
            <Label htmlFor="cancelReason" className="text-xs font-semibold">
              Cancellation Reason (Optional)
            </Label>
            <Textarea
              id="cancelReason"
              rows={2}
              placeholder="e.g. Candidate requested reschedule, requisition closed..."
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
              onClick={handleCancelConfirm}
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
