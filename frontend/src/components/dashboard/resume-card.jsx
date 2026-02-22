"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Trash2, Brain, Loader2 } from "lucide-react";

const statusConfig = {
  uploaded: { label: "Uploaded",  cls: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300" },
  parsed:   { label: "Parsed",    cls: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300" },
  screened: { label: "Screened",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300" },
  error:    { label: "Error",     cls: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300" },
};

const iconBg = {
  uploaded: "from-blue-500 to-blue-600",
  parsed:   "from-violet-500 to-violet-600",
  screened: "from-emerald-500 to-teal-500",
  error:    "from-red-500 to-rose-500",
};

export default function ResumeCard({ resume, onScreen, onDelete, screening = false }) {
  const cfg = statusConfig[resume.status] ?? statusConfig.uploaded;
  const bg  = iconBg[resume.status] ?? iconBg.uploaded;
  return (
    <Card className="border border-border/60 transition-all duration-200 hover:shadow-md hover:shadow-primary/8 hover:border-primary/30">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${bg} shadow-sm`}>
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium">{resume.candidateName}</p>
            <p className="text-xs text-muted-foreground">
              {resume.fileName}
              {resume.candidateEmail && ` · ${resume.candidateEmail}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.cls}`}>
            {cfg.label}
          </span>

          {resume.status === "parsed" && !screening && onScreen && (
            <Button size="sm" className="h-7 bg-gradient-to-r from-primary to-violet-600 text-white hover:opacity-90 shadow-sm shadow-primary/30 border-0" onClick={() => onScreen(resume._id)}>
              <Brain className="mr-1 h-3 w-3" />
              Screen
            </Button>
          )}

          {screening && (
            <Button size="sm" variant="outline" disabled className="h-7">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Screening…
            </Button>
          )}

          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(resume._id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
