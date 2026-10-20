// src/components/dashboard/schedule-interview-dialog.jsx
"use client";

import { useState } from "react";
import {
  Calendar,
  Clock,
  User,
  Video,
  FileText,
  Mail,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useHiringManagers } from "@/hooks/use-users";
import { useScheduleInterview } from "@/hooks/use-interview";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// Round type options with human-readable labels
const ROUND_TYPES = [
  { value: "screening", label: "Initial Screening (HR)" },
  { value: "technical", label: "Technical Interview" },
  { value: "behavioral", label: "Behavioral Round" },
  { value: "system_design", label: "System Design" },
  { value: "cultural_fit", label: "Culture Fit" },
  { value: "managerial", label: "Managerial Round" },
  { value: "executive", label: "Executive / Final Round" },
  { value: "other", label: "Other" },
];

// Meeting platform options
const MEETING_TYPES = [
  { value: "google_meet", label: "Google Meet" },
  { value: "zoom", label: "Zoom Video" },
  { value: "teams", label: "Microsoft Teams" },
  { value: "phone", label: "Phone Call" },
  { value: "in_person", label: "In-Person (Office)" },
  { value: "other", label: "Other" },
];

// Duration options in minutes
const DURATION_OPTIONS = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes (Standard)" },
  { value: "60", label: "60 minutes (1 Hour)" },
  { value: "90", label: "90 minutes (1.5 Hours)" },
];

/**
 * ScheduleInterviewDialog (Shell / Trigger Controller)
 */
export default function ScheduleInterviewDialog({
  resumeId,
  candidateName = "Candidate",
  candidateEmail = "",
  jobTitle = "Role",
  trigger,
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-medium">
            <Calendar className="w-4 h-4" />
            Schedule Interview
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto sm:rounded-xl">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Schedule Interview Round
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Invite {candidateName} for the {jobTitle} position.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Candidate Summary Banner */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border text-xs">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-foreground">{candidateName}</span>
          </div>
          {candidateEmail && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Mail className="w-3.5 h-3.5" />
              <span>{candidateEmail}</span>
            </div>
          )}
        </div>

        {/* Mount only when open: guarantees clean initial state every time */}
        {open && (
          <ScheduleInterviewForm
            resumeId={resumeId}
            candidateEmail={candidateEmail}
            onClose={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * ScheduleInterviewForm (Form State & Mutation Execution)
 */
function ScheduleInterviewForm({ resumeId, candidateEmail, onClose }) {
  const { user: currentUser } = useAuth();
  const { hiringManagers } = useHiringManagers();
  const scheduleMutation = useScheduleInterview();

  // Form states initialize cleanly on mount - no useEffect needed
  const [title, setTitle] = useState("Technical Interview");
  const [roundType, setRoundType] = useState("technical");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState("45");
  const [interviewerId, setInterviewerId] = useState(currentUser?._id || "");
  const [meetingType, setMeetingType] = useState("google_meet");
  const [meetingLink, setMeetingLink] = useState("");
  const [notes, setNotes] = useState("");

  const interviewerOptions = [
    ...(currentUser?._id
      ? [{ _id: currentUser._id, name: `${currentUser.name} (Me)`, role: currentUser.role }]
      : []),
    ...(hiringManagers || []).filter((hm) => hm._id !== currentUser?._id),
  ];

  const currentIsoDateTime = new Date().toISOString().slice(0, 16);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!scheduledAt) {
      toast.error("Please pick an interview date and time");
      return;
    }

    if (!interviewerId) {
      toast.error("Please assign an interviewer");
      return;
    }

    try {
      await scheduleMutation.mutateAsync({
        resumeId,
        title: title.trim() || "Interview",
        roundType,
        scheduledAt: new Date(scheduledAt).toISOString(),
        duration: parseInt(duration, 10),
        interviewer: interviewerId,
        meetingType,
        meetingLink: meetingLink.trim(),
        notes: notes.trim(),
      });

      // Closing unmounts this form, resetting everything automatically
      onClose();
    } catch (err) {
      // Error toast handled by useScheduleInterview onError
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-1">
      {/* 1. Title & Round Type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="title" className="text-xs font-semibold">
            Round Title *
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Technical Screening"
            required
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="roundType" className="text-xs font-semibold">
            Round Type
          </Label>
          <Select value={roundType} onValueChange={setRoundType}>
            <SelectTrigger id="roundType" className="h-9 w-full text-sm">
              <SelectValue placeholder="Select round type" />
            </SelectTrigger>
            <SelectContent>
              {ROUND_TYPES.map((rt) => (
                <SelectItem key={rt.value} value={rt.value}>
                  {rt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 2. Date/Time & Duration */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label
            htmlFor="scheduledAt"
            className="text-xs font-semibold flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            Date & Time *
          </Label>
          <Input
            id="scheduledAt"
            type="datetime-local"
            min={currentIsoDateTime}
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            required
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="duration" className="text-xs font-semibold">
            Duration
          </Label>
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger id="duration" className="h-9 w-full text-sm">
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              {DURATION_OPTIONS.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 3. Interviewer Assignment */}
      <div className="space-y-1.5">
        <Label
          htmlFor="interviewer"
          className="text-xs font-semibold flex items-center gap-1.5"
        >
          <User className="w-3.5 h-3.5 text-emerald-500" />
          Assigned Interviewer *
        </Label>
        <Select value={interviewerId} onValueChange={setInterviewerId}>
          <SelectTrigger id="interviewer" className="h-9 w-full text-sm">
            <SelectValue placeholder="Choose an interviewer..." />
          </SelectTrigger>
          <SelectContent>
            {interviewerOptions.map((user) => (
              <SelectItem key={user._id} value={user._id}>
                {user.name} ({user.role?.replace("_", " ")})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 4. Meeting Platform & Link */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label
            htmlFor="meetingType"
            className="text-xs font-semibold flex items-center gap-1.5"
          >
            <Video className="w-3.5 h-3.5 text-indigo-500" />
            Platform
          </Label>
          <Select value={meetingType} onValueChange={setMeetingType}>
            <SelectTrigger id="meetingType" className="h-9 w-full text-sm">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              {MEETING_TYPES.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="meetingLink" className="text-xs font-semibold">
            Meeting Link or Room Location
          </Label>
          <Input
            id="meetingLink"
            type="text"
            placeholder="https://meet.google.com/xyz or Room 402"
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
      </div>

      {/* 5. Internal Notes */}
      <div className="space-y-1.5">
        <Label
          htmlFor="notes"
          className="text-xs font-semibold flex items-center gap-1.5"
        >
          <FileText className="w-3.5 h-3.5 text-amber-500" />
          Internal Interview Notes (Hidden from Candidate)
        </Label>
        <Textarea
          id="notes"
          rows={2}
          placeholder="Focus areas, system design topics, questions to ask..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="text-sm resize-none"
        />
      </div>

      {/* Notification Banner */}
      <div className="rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 p-3 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
        <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
        <p>
          Confirming this will automatically dispatch an invitation email to{" "}
          <strong className="underline">{candidateEmail || "the candidate"}</strong>,
          log the activity in the audit timeline, and advance their stage to{" "}
          <strong>Shortlisted</strong> on the Kanban board.
        </p>
      </div>

      <DialogFooter className="pt-2 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={scheduleMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={scheduleMutation.isPending}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
        >
          {scheduleMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Scheduling...
            </>
          ) : (
            <>
              <Calendar className="w-4 h-4" />
              Send Invite
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}