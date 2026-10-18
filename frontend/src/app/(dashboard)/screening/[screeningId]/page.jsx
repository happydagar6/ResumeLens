"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  useScreening,
  useMakeDecision,
  useGenerateEmail,
  useSendScreeningEmail,
  usePipelineStatus,
  useRescreen,
  useDeleteScreening,
} from "@/hooks/use-screening";
import { useQuestions, useGenerateQuestions } from "@/hooks/use-questions";
import { useDeleteResume } from "@/hooks/use-resume";
import { usePermissions } from "@/hooks/use-permissions";
import { useRouter } from "next/navigation";
import ScoreGauge from "@/components/dashboard/score-gauge";
import ScoreBreakdown from "@/components/dashboard/score-breakdown";
import CandidateChat from "@/components/dashboard/candidate-chat";
import AuditTimeline from "@/components/dashboard/audit-timeline";
import SkillsDisplay from "@/components/dashboard/skills-display";
import QuestionsDisplay from "@/components/dashboard/questions-display";
import CandidateNotes from "@/components/dashboard/candidate-notes";
import { LoadingSpinner } from "@/components/common/loading-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Brain,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  CheckCircle2,
  Mail,
  Copy,
  Check,
  Download,
  RefreshCw,
  Trash2,
  Send,
} from "lucide-react";
import Link from "next/link";
import { generateScreeningPDF } from "@/lib/generate-screening-pdf";

const recommendationLabels = {
  strong_yes: { label: "Strong Yes", icon: ThumbsUp, color: "text-green-600" },
  yes: { label: "Yes", icon: ThumbsUp, color: "text-green-500" },
  maybe: { label: "Maybe", icon: null, color: "text-yellow-600" },
  no: { label: "No", icon: ThumbsDown, color: "text-orange-500" },
  strong_no: { label: "Strong No", icon: ThumbsDown, color: "text-red-500" },
};

export default function ScreeningDetailPage() {
  const rescreenMutation = useRescreen();
  const { screeningId } = useParams();

  // ──────────────────────────────────────────────────────────────────────────────────
  const { screening, isLoading: screeningLoading } = useScreening(screeningId);
  // questions = the interviewQuestion document (null if none generated yet)
  const { questions, isLoading: questionsLoading } = useQuestions(screeningId);

  // ────────────────────────────────────────────────────────────────────────────────
  const generateMutation = useGenerateQuestions();
  const deleteResumeMutation = useDeleteResume();
  const deleteScreeningMutation = useDeleteScreening();
  const router = useRouter();

  // Permissions + decision mutation
  const { canMakeDecision, canGenerateQuestions } = usePermissions();
  const decisionMutation = useMakeDecision();

  // Local state for notes textarea
  const [decisionNotes, setDecisionNotes] = useState("");

  // Email draft state
  const emailMutation = useGenerateEmail();
  const sendEmailMutation = useSendScreeningEmail();
  const [emailType, setEmailType] = useState(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [editableSubject, setEditableSubject] = useState("");
  const [editableBody, setEditableBody] = useState("");

  const handleGenerateEmail = (type) => {
    setEmailType(type);
    emailMutation.mutate(
      { screeningId, emailType: type },
      {
        onSuccess: (data) => {
          setRecipientEmail(candidate?.candidateEmail || "");
          setEditableSubject(data?.data?.subject || "");
          setEditableBody(data?.data?.body || "");
          setEmailDialogOpen(true);
        },
      },
    );
  };

  const handleSendEmail = () => {
    if (!editableSubject.trim() || !editableBody.trim()) return;
    sendEmailMutation.mutate(
      {
        screeningId,
        recipientEmail,
        subject: editableSubject,
        body: editableBody,
        emailType: emailType || "general",
      },
      {
        onSuccess: () => {
          setEmailDialogOpen(false);
        },
      },
    );
  };

  const copyText = (text, setCopied) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (screeningLoading || questionsLoading) return <LoadingSpinner />;
  if (!screening)
    return <p className="text-muted-foreground">Screening not found.</p>;

  const rec =
    recommendationLabels[screening.recommendation] ||
    recommendationLabels.maybe;
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
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Screening: {candidate?.candidateName || "Candidate"}
          </h1>
          <p className="text-muted-foreground">
            {job?.title} at {job?.company}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            generateScreeningPDF(screening, questions?.questions || [])
          }
        >
          <Download className="mr-2 h-4 w-4" />
          Export PDF
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={rescreenMutation.isPending}
          onClick={() =>
            rescreenMutation.mutate({
              resumeId: candidate?._id,
              screeningId,
              jobId: job?._id,
            })
          }
        >
          {rescreenMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Re-Screen
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={deleteResumeMutation.isPending || deleteScreeningMutation.isPending}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this candidate. The PDF resume and screening results will be removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  const resumeIdToDelete = candidate?._id || candidate?.id || (typeof candidate === "string" ? candidate : null);
                  const redirectPath = job ? `/jobs/${job._id || job?.id || (typeof job === 'string' ? job : '')}/screening` : "/jobs";

                  if (resumeIdToDelete) {
                    deleteResumeMutation.mutate(resumeIdToDelete, {
                      onSuccess: () => router.push(redirectPath)
                    });
                  } else {
                    // Fallback for orphaned screening where resume no longer exists
                    deleteScreeningMutation.mutate(screeningId, {
                      onSuccess: () => router.push(redirectPath)
                    });
                  }
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Score + Recommendation */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Match Score</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreGauge score={screening.overallScore} size="lg" />
            <ScoreBreakdown breakdown={screening.scoreBreakdown} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recommendation</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`flex items-center gap-2 text-xl font-bold ${rec.color}`}
            >
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
              These are AI validation warnings, not errors. Review the result
              manually if you see unexpected flags.
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
        {screening.strengths?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-green-600">
                Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Array.isArray(screening.strengths) ? (
                <ul className="space-y-2">
                  {screening.strengths.map((s, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {screening.strengths}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {screening.weaknesses?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-red-500">
                Weaknesses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Array.isArray(screening.weaknesses) ? (
                <ul className="space-y-2">
                  {screening.weaknesses.map((w, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {screening.weaknesses}
                </p>
              )}
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
          Generate a professional email for this candidate based on the
          screening result.
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { type: "shortlisted", label: "Shortlist Email" },
            { type: "rejection", label: "Rejection Email" },
            { type: "interview_invite", label: "Interview Invite" },
            { type: "offer", label: "Offer Email" },
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
        <DialogContent className="max-w-2xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review & Send Email</DialogTitle>
            <DialogDescription>
              Review, personalize, and dispatch this AI-drafted email directly to the candidate via Resend.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Recipient Email */}
            <div className="space-y-1.5">
              <Label htmlFor="recipientEmail" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                To (Candidate Email)
              </Label>
              <Input
                id="recipientEmail"
                type="email"
                placeholder="candidate@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
              {!candidate?.candidateEmail && (
                <p className="text-xs text-amber-500">
                  No email address was found in the parsed resume. Please provide recipient email.
                </p>
              )}
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="emailSubject" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Subject Line
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => copyText(editableSubject, setCopiedSubject)}
                >
                  {copiedSubject ? (
                    <Check className="h-3.5 w-3.5 text-green-600 mr-1" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 mr-1" />
                  )}
                  {copiedSubject ? "Copied" : "Copy"}
                </Button>
              </div>
              <Input
                id="emailSubject"
                value={editableSubject}
                onChange={(e) => setEditableSubject(e.target.value)}
                placeholder="Email subject..."
              />
            </div>

            {/* Body */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="emailBody" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Message Body
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => copyText(editableBody, setCopiedBody)}
                >
                  {copiedBody ? (
                    <Check className="h-3.5 w-3.5 text-green-600 mr-1" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 mr-1" />
                  )}
                  {copiedBody ? "Copied" : "Copy"}
                </Button>
              </div>
              <Textarea
                id="emailBody"
                value={editableBody}
                onChange={(e) => setEditableBody(e.target.value)}
                rows={9}
                className="font-sans text-sm leading-relaxed"
                placeholder="Write your email message..."
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setEmailDialogOpen(false)}
              disabled={sendEmailMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={
                sendEmailMutation.isPending ||
                !recipientEmail.trim() ||
                !editableSubject.trim() ||
                !editableBody.trim()
              }
            >
              {sendEmailMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Email...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Email to Candidate
                </>
              )}
            </Button>
          </DialogFooter>
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

      {/* ── Internal Recruiter Notes & Team Collaboration ── */}
      <div className="mt-8">
        <CandidateNotes screeningId={screeningId} resumeId={candidate?._id} />
      </div>

      {/* ── Candidate Activity Timeline ── */}
      <div className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold tracking-tight border-b pb-2">Activity Timeline</h2>
        <AuditTimeline resumeId={candidate?._id} />
      </div>

      {/* ── Floating AI Chat Widget ── */}
      {/* Fixed position, always visible in bottom-right corner while on this page */}
      <CandidateChat screeningId={screeningId} />
    </div>
  );
}
