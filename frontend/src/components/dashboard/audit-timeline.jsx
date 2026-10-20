// src/components/dashboard/audit-timeline.jsx
"use client";

import { useAuditLogs } from "@/hooks/use-screening";
import { format } from "date-fns";
import {
  Upload,
  Cpu,
  CheckCircle,
  Mail,
  FileText,
  User,
  MessageSquare,
  CalendarCheck,
  RotateCcw,
  XCircle,
} from "lucide-react";

export default function AuditTimeline({ resumeId }) {
  const { data, isLoading } = useAuditLogs(resumeId);
  const logs = data?.data || [];

  if (isLoading)
    return (
      <p className="text-sm text-muted-foreground animate-pulse">
        Loading timeline...
      </p>
    );
  if (logs.length === 0)
    return (
      <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
    );

  return (
    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-linear-to-b before:from-transparent before:via-muted before:to-transparent">
      {logs.map((log) => {
        let Icon = FileText;
        let colorClass = "bg-muted text-muted-foreground";
        let title = "Action Recorded";

        if (log.action === "UPLOADED") {
          Icon = Upload;
          colorClass =
            "bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
          title = "Resume Uploaded";
        } else if (log.action === "SCREENED") {
          Icon = Cpu;
          colorClass =
            "bg-purple-100 text-purple-600 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800";
          title = "AI Screening Completed";
        } else if (log.action === "DECISION_CHANGED") {
          Icon = CheckCircle;
          colorClass =
            "bg-green-100 text-green-600 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
          title = `Decision: ${log.metadata?.newDecision?.toUpperCase()}`;
        } else if (log.action === "EMAIL_SENT") {
          Icon = Mail;
          colorClass =
            "bg-amber-100 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
          title = `Email Sent: ${log.metadata?.subject || "Candidate"}`;
        } else if (log.action === "NOTE_ADDED") {
          Icon = MessageSquare;
          colorClass =
            "bg-sky-100 text-sky-600 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800";
          const categoryTag = log.metadata?.category
            ? ` (${log.metadata.category.toUpperCase()})`
            : "";
          title = `Team Note Added${categoryTag}`;
        } else if (log.action === "INTERVIEW_SCHEDULED") {
          Icon = CalendarCheck;
          colorClass =
            "bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
          title = `Interview Scheduled: ${log.metadata?.title || "Round"}`;
        } else if (log.action === "INTERVIEW_RESCHEDULED") {
          Icon = RotateCcw;
          colorClass =
            "bg-amber-100 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
          title = "Interview Rescheduled";
        } else if (log.action === "INTERVIEW_CANCELLED") {
          Icon = XCircle;
          colorClass =
            "bg-rose-100 text-rose-600 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800";
          title = `Interview Cancelled: ${log.metadata?.title || "Round"}`;
        }

        return (
          <div
            key={log._id}
            className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
          >
            {/* Timeline Icon */}
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full border shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${colorClass}`}
            >
              <Icon className="w-5 h-5" />
            </div>

            {/* Timeline Content Card */}
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border bg-card shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-sm">{title}</h3>
                <time className="text-xs text-muted-foreground font-medium">
                  {format(new Date(log.createdAt), "MMM d, h:mm a")}
                </time>
              </div>

              {/* Note Snippet */}
              {log.metadata?.noteSnippet && (
                <p className="text-xs text-muted-foreground/90 italic mt-1 line-clamp-2">
                  &ldquo;{log.metadata.noteSnippet}&rdquo;
                </p>
              )}

              {/* Scheduled Date Detail */}
              {log.metadata?.scheduledAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Date:{" "}
                  <span className="font-medium text-foreground">
                    {format(
                      new Date(log.metadata.scheduledAt),
                      "EEE, MMM d, yyyy 'at' h:mm a"
                    )}
                  </span>
                </p>
              )}

              {/* Rescheduled New Date Detail */}
              {log.metadata?.newDate && (
                <p className="text-xs text-muted-foreground mt-1">
                  New Date:{" "}
                  <span className="font-medium text-foreground">
                    {format(
                      new Date(log.metadata.newDate),
                      "EEE, MMM d, yyyy 'at' h:mm a"
                    )}
                  </span>
                </p>
              )}

              {/* Cancellation Reason */}
              {log.metadata?.reason && (
                <p className="text-xs text-rose-600 dark:text-rose-400 italic mt-1">
                  Reason: &ldquo;{log.metadata.reason}&rdquo;
                </p>
              )}

              {/* Actor (Who triggered this action) */}
              <div className="text-sm text-muted-foreground flex items-center gap-1.5 mt-2">
                <User className="w-3 h-3" />
                <span>
                  {log.performedBy ? log.performedBy.name : "System AI"}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
