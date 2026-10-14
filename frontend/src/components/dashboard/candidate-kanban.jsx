"use client";
import { useState } from "react";
import Link from "next/link";
import { useMakeDecision, useRunScreening } from "@/hooks/use-screening";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Inbox,
  Sparkles,
  UserCheck,
  Award,
  XCircle,
  MoreVertical,
  Zap,
  ExternalLink,
  Loader2,
  Calendar,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const COLUMNS = [
  {
    id: "applied",
    title: "Applied",
    desc: "Awaiting AI screening",
    icon: Inbox,
    color: "border-sky-500/30 text-sky-600 dark:text-sky-400 bg-sky-500/5",
    badge: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  },
  {
    id: "in_review",
    title: "In Review",
    desc: "AI scored, awaiting review",
    icon: Sparkles,
    color:
      "border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5",
    badge:
      "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  {
    id: "shortlisted",
    title: "Shortlisted",
    desc: "Invited to interview",
    icon: UserCheck,
    color:
      "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5",
    badge:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  {
    id: "offered",
    title: "Offered",
    desc: "Offer extended",
    icon: Award,
    color:
      "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5",
    badge:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  {
    id: "rejected",
    title: "Rejected",
    desc: "Not selected",
    icon: XCircle,
    color: "border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/5",
    badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
];

const recommendationConfig = {
  strong_yes: {
    label: "Strong Yes",
    variant: "default",
    color: "bg-emerald-500 text-white",
  },
  yes: { label: "Yes", variant: "default", color: "bg-green-600 text-white" },
  maybe: {
    label: "Maybe",
    variant: "secondary",
    color:
      "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  no: {
    label: "No",
    variant: "outline",
    color:
      "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20",
  },
  strong_no: {
    label: "Strong No",
    variant: "destructive",
    color: "bg-rose-600 text-white",
  },
};

export default function CandidateKanban({
  screenings = [],
  resumes = [],
  jobId,
  canMakeDecision = true,
  canRunScreening = true,
}) {
  const decisionMutation = useMakeDecision();
  const screenMutation = useRunScreening();

  const [draggedCard, setDraggedCard] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const screenedResumeIds = new Set(
    screenings.map((s) => s.resumeId?._id || s.resumeId),
  );
  const unscreenedResumes = resumes.filter(
    (r) => !screenedResumeIds.has(r._id) && r.status !== "screened",
  );

  const columnData = {
    applied: unscreenedResumes,
    in_review: screenings.filter(
      (s) => !s.hiringManagerDecision || s.hiringManagerDecision === "on_hold"
    ),
    shortlisted: screenings.filter((s) => s.hiringManagerDecision === "shortlisted"),
    offered: screenings.filter((s) => s.hiringManagerDecision === "offered"),
    rejected: screenings.filter((s) => s.hiringManagerDecision === "rejected"),
  };


  // 1. When the recruiter starts dragging a card.
  const handleDragStart = (e, item, sourceCol, type) => {
    if (!canMakeDecision) return; // if can't make a decision then return
    setDraggedCard({ id: item._id, sourceCol, type });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    
    if (dragOverCol !== colId) {
      setDragOverCol(colId);
    }
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverCol(null);
    }
  };

  const handleDrop = (e, targetColId) => {
    e.preventDefault();
    setDragOverCol(null);

    if (!draggedCard || draggedCard.sourceCol === targetColId) return;

    if (draggedCard.type === "resume" && targetColId !== "applied") {
      return;
    }

    if (draggedCard.type === "screening") {
      decisionMutation.mutate({
        screeningId: draggedCard.id,
        decision: targetColId,
        jobId,
      });
    }
    setDraggedCard(null);
  };

  const moveCandidate = (screeningId, targetColId) => {
    decisionMutation.mutate({
      screeningId,
      decision: targetColId,
      jobId,
    });
  };

    return (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 items-start pb-8">
      {COLUMNS.map((col) => {
        const Icon = col.icon;
        const items = columnData[col.id] || [];
        const isDragTarget = dragOverCol === col.id;

        return (
          <div
            key={col.id}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.id)}
            className={`flex flex-col rounded-xl border bg-muted/20 transition-all min-h-[550px] ${
              isDragTarget
                ? "ring-2 ring-primary/40 border-primary bg-primary/5"
                : "border-border/60"
            }`}
          >
            {/* 1. Column Header */}
            <div className={`p-3.5 border-b rounded-t-xl ${col.color}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <h3 className="font-semibold text-sm tracking-tight">{col.title}</h3>
                </div>
                <Badge variant="outline" className={`h-5 px-2 text-xs font-bold ${col.badge}`}>
                  {items.length}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{col.desc}</p>
            </div>

            {/* 2. Cards Drop Area */}
            <div className="flex-1 p-2 space-y-2.5 overflow-y-auto max-h-[720px]">
              {items.length === 0 ? (
                <div className="h-32 flex flex-col items-center justify-center border border-dashed rounded-lg text-muted-foreground/60 text-xs">
                  <span>No candidates</span>
                </div>
              ) : (
                items.map((item) => {
                  // Card Type A: Unscreened Resume (in "Applied" column)
                  if (col.id === "applied") {
                    return (
                      <Card
                        key={item._id}
                        className="p-3 shadow-xs bg-card hover:border-primary/40 transition-all border-border/80"
                      >
                        <div className="space-y-2">
                          <div>
                            <h4 className="font-semibold text-sm leading-snug">
                              {item.candidateName || "Unknown Candidate"}
                            </h4>
                            <p className="text-xs text-muted-foreground truncate">
                              {item.candidateEmail || "No email on file"}
                            </p>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {item.createdAt
                                ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })
                                : "Recently"}
                            </span>

                            {canRunScreening && (
                              <Button
                                size="xs"
                                variant="outline"
                                className="h-7 text-xs gap-1 hover:bg-primary hover:text-primary-foreground"
                                disabled={screenMutation.isPending}
                                onClick={() =>
                                  screenMutation.mutate({ resumeId: item._id, jobId })
                                }
                              >
                                {screenMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Zap className="h-3 w-3 text-amber-500 fill-amber-500" />
                                )}
                                Screen
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  }

                  // Card Type B: Screened Candidate (in all other columns)
                  const candidate = item.resumeId;
                  const rec =
                    recommendationConfig[item.recommendation] ||
                    recommendationConfig.maybe;
                  const score = item.overallScore ?? 0;
                  const scoreColor =
                    score >= 75
                      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                      : score >= 60
                      ? "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20"
                      : "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20";

                  const isDraggingThis = draggedCard?.id === item._id;

                  return (
                    <Card
                      key={item._id}
                      draggable={canMakeDecision}
                      onDragStart={(e) => handleDragStart(e, item, col.id, "screening")}
                      onDragEnd={() => setDraggedCard(null)}
                      className={`p-3.5 shadow-xs bg-card hover:border-primary/50 transition-all border-border/80 group ${
                        canMakeDecision ? "cursor-grab active:cursor-grabbing" : ""
                      } ${isDraggingThis ? "opacity-40 scale-95" : ""}`}
                    >
                      {/* Top Row: Candidate Name & Quick Menu */}
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/screening/${item._id}`}
                            className="font-semibold text-sm hover:underline hover:text-primary transition-colors flex items-center gap-1.5 truncate"
                          >
                            <span className="truncate">{candidate?.candidateName || "Candidate"}</span>
                            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 shrink-0 text-muted-foreground" />
                          </Link>
                          <p className="text-xs text-muted-foreground truncate">
                            {candidate?.candidateEmail || ""}
                          </p>
                        </div>

                        {/* Move To Dropdown Menu (Touch & Accessibility) */}
                        {canMakeDecision && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 -mr-1.5 text-muted-foreground hover:text-foreground"
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 text-xs">
                              <DropdownMenuLabel>Move to Stage</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {COLUMNS.filter((c) => c.id !== "applied" && c.id !== col.id).map(
                                (c) => (
                                  <DropdownMenuItem
                                    key={c.id}
                                    onClick={() => moveCandidate(item._id, c.id)}
                                    className="gap-2 cursor-pointer"
                                  >
                                    <c.icon className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>{c.title}</span>
                                  </DropdownMenuItem>
                                )
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      {/* Middle Row: Score & Recommendation */}
                      <div className="flex items-center gap-2 mt-3">
                        <div
                          className={`px-2 py-0.5 rounded-md border text-xs font-bold tracking-tight ${scoreColor}`}
                        >
                          {score}/100
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 font-medium ${rec.color}`}
                        >
                          {rec.label}
                        </Badge>
                      </div>

                      {/* Bottom Row: Matched Skills Preview */}
                      {item.matchedSkills?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2.5 pt-2 border-t border-border/50">
                          {item.matchedSkills.slice(0, 3).map((skill, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded-sm"
                            >
                              {skill}
                            </span>
                          ))}
                          {item.matchedSkills.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{item.matchedSkills.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
