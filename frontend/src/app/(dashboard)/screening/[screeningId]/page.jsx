"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useScreening, useMakeDecision, useGenerateEmail } from "@/hooks/use-screening";
import { useQuestions, useGenerateQuestions } from "@/hooks/use-questions";
import { usePermissions } from "@/hooks/use-permissions";
import ScoreGauge from "@/components/dashboard/score-gauge";
import SkillsDisplay from "@/components/dashboard/skills-display";
import QuestionsDisplay from "@/components/dashboard/questions-display";
import { LoadingSpinner } from "@/components/common/loading-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Brain, Loader2, ThumbsUp, ThumbsDown, AlertTriangle, CheckCircle2, Mail, Copy, Check } from "lucide-react";
import Link from "next/link";

const recommendationLabels = {
  strong_yes: { label: "Strong Yes", icon: ThumbsUp, color: "text-green-600" },
  yes: { label: "Yes", icon: ThumbsUp, color: "text-green-500" },
  maybe: { label: "Maybe", icon: null, color: "text-yellow-600" },
  no: { label: "No", icon: ThumbsDown, color: "text-orange-500" },
  strong_no: { label: "Strong No", icon: ThumbsDown, color: "text-red-500" },
};

export default function ScreeningDetailPage() {
  const { screeningId } = useParams();

  // â”€â”€ Data fetching â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const { screening, isLoading: screeningLoading } = useScreening(screeningId);
  // questions = the interviewQuestion document (null if none generated yet)
  const { questions, isLoading: questionsLoading } = useQuestions(screeningId);

  // â”€â”€ Mutations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const generateMutation = useGenerateQuestions();

  // Permissions + decision mutation
  const { canMakeDecision, canGenerateQuestions } = usePermissions();
  const decisionMutation = useMakeDecision();

  // Local state for notes textarea
  const [decisionNotes, setDecisionNotes] = useState("");

  // Email draft state
  const emailMutation = useGenerateEmail();
  const [emailType, setEmailType] = useState(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);

  const handleGenerateEmail = (type) => {
    setEmailType(type);
    emailMutation.mutate(
      { screeningId, emailType: type },
      { onSuccess: () => setEmailDialogOpen(true) }
    );
  };

  const copyText = (text, setCopied) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (screeningLoading || questionsLoading) return <LoadingSpinner />;
  if (!screening) return <p className="text-muted-foreground">Screening not found.</p>;

  const rec = recommendationLabels[screening.recommendation] || recommendationLabels.maybe;
  const candidate = screening.resumeId;
  const job = screening.jobId;
  const hasFlags = screening.validationFlags?.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={job ? `/jobs/${job._id}/screening` : "/jobs"}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Screening: {candidate?.candidateName || "Candidate"}
          </h1>
          <p className="text-muted-foreground">
            {job?.title} at {job?.company}
          </p>
        </div>
      </div>

      {/* Score + Recommendation */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Match Score</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreGauge score={screening.overallScore} size="lg" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recommendation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`flex items-center gap-2 text-xl font-bold ${rec.color}`}>
              {rec.icon && <rec.icon className="h-6 w-6" />}
              {rec.label}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Flags (Phase 8 validation warnings) */}
      {hasFlags && (
        <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertTitle className="text-yellow-800 dark:text-yellow-300">
            Quality Flags ({screening.validationFlags.length})
          </AlertTitle>
          <AlertDescription className="text-yellow-700 dark:text-yellow-400">
            <p className="mb-2 text-xs">
              These are AI validation warnings, not errors. Review the result manually if you see unexpected flags.
            </p>
            <ul className="space-y-1">
              {screening.validationFlags.map((flag, i) => (
                <li key={i} className="text-xs font-mono">
                  {flag}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Skills */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Skills Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <SkillsDisplay
            matchedSkills={screening.matchedSkills}
            missingSkills={screening.missingSkills}
          />
        </CardContent>
      </Card>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {screening.strengths && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-green-600">Strengths</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {screening.strengths}
              </p>
            </CardContent>
          </Card>
        )}

        {screening.weaknesses && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-red-500">Weaknesses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {screening.weaknesses}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Separator />

      {/* Hiring Manager Decision */}
      {canMakeDecision && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Hiring Manager Decision</h2>

          {/* Show current decision if one exists */}
          {screening.hiringManagerDecision && (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium capitalize">
                Current decision:{" "}
                <span className="text-primary">
                  {screening.hiringManagerDecision.replace("_", " ")}
                </span>
              </span>
              {screening.decidedBy && (
                <span className="ml-auto text-xs text-muted-foreground">
                  by {screening.decidedBy.name}
                </span>
              )}
            </div>
          )}

          {/* Decision buttons */}
          <div className="flex flex-wrap gap-2">
            {[
              { value: "shortlisted", label: "Shortlist", variant: "default" },
              { value: "offered", label: "Offer", variant: "default" },
              { value: "on_hold", label: "On Hold", variant: "secondary" },
              { value: "rejected", label: "Reject", variant: "destructive" },
            ].map((opt) => (
              <Button
                key={opt.value}
                variant={opt.variant}
                size="sm"
                disabled={decisionMutation.isPending}
                onClick={() =>
                  decisionMutation.mutate({
                    screeningId,
                    decision: opt.value,
                    notes: decisionNotes,
                    jobId: job?._id,
                  })
                }
              >
                {opt.label}
              </Button>
            ))}
          </div>

          {/* Optional notes */}
          <Textarea
            placeholder="Add notes (optional)..."
            value={decisionNotes}
            onChange={(e) => setDecisionNotes(e.target.value)}
            rows={3}
            className="resize-none"
          />
          {screening.notes && !decisionNotes && (
            <p className="text-xs text-muted-foreground italic">
              Previous notes: {screening.notes}
            </p>
          )}
        </div>
      )}

      <Separator />

      {/* AI Email Draft */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">AI Email Draft</h2>
        <p className="text-sm text-muted-foreground">
          Generate a professional email for this candidate based on the screening result.
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { type: "shortlisted",     label: "Shortlist Email" },
            { type: "rejection",       label: "Rejection Email" },
            { type: "interview_invite", label: "Interview Invite" },
            { type: "offer",           label: "Offer Email" },
          ].map((opt) => (
            <Button
              key={opt.type}
              variant="outline"
              size="sm"
              disabled={emailMutation.isPending}
              onClick={() => handleGenerateEmail(opt.type)}
            >
              {emailMutation.isPending && emailType === opt.type ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Email Draft Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generated Email Draft</DialogTitle>
            <DialogDescription>Review and copy the AI-generated email to send to the candidate.</DialogDescription>
          </DialogHeader>
          {emailMutation.data && (
            <div className="space-y-4">
              {/* Subject */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Subject</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyText(emailMutation.data.data.subject, setCopiedSubject)}
                  >
                    {copiedSubject ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  {emailMutation.data.data.subject}
                </p>
              </div>

              {/* Body */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Body</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyText(emailMutation.data.data.body, setCopiedBody)}
                  >
                    {copiedBody ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <pre className="rounded-md border bg-muted/30 px-3 py-2 text-sm whitespace-pre-wrap font-sans max-h-80 overflow-y-auto">
                  {emailMutation.data.data.body}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Separator />

      {/* Interview Questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Interview Questions</h2>
          {/* Only show generate button when no questions exist yet and user has permission */}
          {!questions && canGenerateQuestions && (
            <Button
              onClick={() => generateMutation.mutate({ screeningId })}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Brain className="mr-2 h-4 w-4" />
              )}
              Generate Questions
            </Button>
          )}
        </div>

        {/* questions is the interviewQuestion document; .questions is the array */}
        <QuestionsDisplay questions={questions?.questions || []} />
      </div>
    </div>
  );
}
