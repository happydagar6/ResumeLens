"use client";

import { useAuditLogs } from "@/hooks/use-screening";
import { format } from "date-fns";
import { Upload, Cpu, CheckCircle, Mail, FileText, User } from "lucide-react";

export default function AuditTimeline({ resumeId }) {
  const { data, isLoading } = useAuditLogs(resumeId); // audit logs
  const logs = data?.data || []; // logs

  if (isLoading) return <p className="text-sm text-muted-foreground animate-pulse">Loading timeline...</p>; // loading message
  if (logs.length === 0) return <p className="text-sm text-muted-foreground">No activity recorded yet.</p>; // no activity message

  return (
    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-linear-to-b before:from-transparent before:via-muted before:to-transparent">
      {logs.map((log) => {
        let Icon = FileText;
        let colorClass = "bg-muted text-muted-foreground";
        let title = "Action Recorded";

        if (log.action === "UPLOADED") {
          Icon = Upload;
          colorClass = "bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
          title = "Resume Uploaded";
        } else if (log.action === "SCREENED") {
          Icon = Cpu;
          colorClass = "bg-purple-100 text-purple-600 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800";
          title = "AI Screening Completed";
        } else if (log.action === "DECISION_CHANGED") {
          Icon = CheckCircle;
          colorClass = "bg-green-100 text-green-600 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
          title = `Decision: ${log.metadata?.newDecision?.toUpperCase()}`;
        } else if (log.action === "EMAIL_SENT") {
          Icon = Mail;
          colorClass = "bg-amber-100 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
          title = `Email Sent: ${log.metadata?.subject || "Candidate"}`;
        }

        return (
          <div key={log._id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            {/* Icon */}
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${colorClass}`}>
              <Icon className="w-5 h-5" />
            </div>

            {/* Content Card */}
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border bg-card shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-sm">{title}</h3>
                <time className="text-xs text-muted-foreground font-medium">
                  {format(new Date(log.createdAt), "MMM d, h:mm a")}
                </time>
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-1.5 mt-2">
                <User className="w-3 h-3" />
                <span>{log.performedBy ? log.performedBy.name : "System AI"}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}