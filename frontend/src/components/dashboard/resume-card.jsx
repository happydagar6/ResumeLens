"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Trash2, Brain, Loader2 } from "lucide-react";

const statusColors = {
  uploaded: "outline",
  parsed: "default",
  screened: "secondary",
  error: "destructive",
};

export default function ResumeCard({ resume, onScreen, onDelete, screening = false }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <FileText className="h-5 w-5 text-muted-foreground" />
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
          <Badge variant={statusColors[resume.status] || "outline"}>
            {resume.status}
          </Badge>

          {resume.status === "parsed" && !screening && onScreen && (
            <Button size="sm" variant="outline" onClick={() => onScreen(resume._id)}>
              <Brain className="mr-1 h-3 w-3" />
              Screen
            </Button>
          )}

          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(resume._id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
