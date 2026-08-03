"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useJob } from "@/hooks/use-jobs";
import { useQuestionBank, useToggleUsed } from "@/hooks/use-questions";
import { LoadingSpinner } from "@/components/common/loading-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, BookOpen, Brain, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";

// Static colour classes per category — avoids Tailwind purging dynamic names
const CATEGORY_COLORS = {
    technical:   "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    behavioral:  "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    situational: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    experience:  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    general:     "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const ALL_CATEGORIES = ["technical", "behavioral", "situational", "experience", "general"];

export default function QuestionBankPage() {
    const { jobId } = useParams();
    const [activeTab, setActiveTab] = useState("all");

    const { job, isLoading: jobLoading } = useJob(jobId);
    const { bank, isLoading: bankLoading } = useQuestionBank(jobId);
    const toggleMutation = useToggleUsed(jobId);

    if (jobLoading || bankLoading) return <LoadingSpinner />;

    const docs = bank?.docs ?? [];

    // Flatten all questions into a single list with doc context attached so the
    // toggle PATCH knows which parent document to update
    const allQuestions = docs.flatMap((doc) =>
        doc.questions.map((q) => ({
            ...q,
            docId: doc._id,
            candidateName: doc.resumeId?.candidateName ?? "Unknown",
            score: doc.screeningId?.overallScore ?? null,
        }))
    );

    // What does this .flatMap() do ? 
    // .flatMap() is a method that is used to flatten an array of arrays into a single array
    // In this case, it is used to flatten an array of documents into a single array of 
    // questions with metadata attached.

    const filtered =
        activeTab === "all"
            ? allQuestions
            : allQuestions.filter((q) => q.category === activeTab);

    // Tab badge counts — computed from full list, not filtered
    const categoryCounts = ALL_CATEGORIES.reduce((acc, cat) => {
        acc[cat] = allQuestions.filter((q) => q.category === cat).length;
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            {/* ── Header ────────────────────────────────────────────────── */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`/jobs/${jobId}/screening`}>
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>

                <div className="flex-1">
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <BookOpen className="h-6 w-6" />
                        Question Bank
                    </h1>
                    <p className="text-muted-foreground">
                        {job?.title} at {job?.company}
                    </p>
                </div>

                <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                        <Brain className="h-4 w-4" />
                        {bank?.totalQuestions ?? 0} questions
                    </span>
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                        <CheckCircle2 className="h-4 w-4" />
                        {bank?.usedCount ?? 0} used
                    </span>
                </div>
            </div>

            {/* ── Empty state ──────────────────────────────────────────── */}
            {docs.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-4">
                        <BookOpen className="h-12 w-12 text-muted-foreground" />
                        <div className="space-y-1">
                            <p className="font-medium">No questions yet</p>
                            <p className="text-sm text-muted-foreground">
                                Generate interview questions from the Screening Results page
                                and they will appear here.
                            </p>
                        </div>
                        <Button variant="outline" asChild>
                            <Link href={`/jobs/${jobId}/screening`}>
                                Go to Screening Results
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                /* ── Tabbed question list ────────────────────────────────── */
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="flex-wrap h-auto gap-1 mb-2">
                        <TabsTrigger value="all">
                            All ({allQuestions.length})
                        </TabsTrigger>
                        {ALL_CATEGORIES.filter((cat) => categoryCounts[cat] > 0).map((cat) => (
                            <TabsTrigger key={cat} value={cat} className="capitalize">
                                {cat} ({categoryCounts[cat]})
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {/* Render a TabsContent for each tab so Radix handles visibility properly */}
                    {["all", ...ALL_CATEGORIES].map((cat) => (
                        <TabsContent key={cat} value={cat} className="mt-0 space-y-3">
                            {filtered.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    No questions in this category.
                                </p>
                            ) : (
                                filtered.map((q) => (
                                    <Card
                                        key={q._id}
                                        className={
                                            q.usedInInterview
                                                ? "border-green-200 dark:border-green-800"
                                                : ""
                                        }
                                    >
                                        <CardContent className="flex items-start gap-3 p-4">
                                            {/* Toggle "used in interview" button */}
                                            <button
                                                className="mt-0.5 shrink-0 transition-opacity hover:opacity-70 focus:outline-none"
                                                title={
                                                    q.usedInInterview
                                                        ? "Mark as not used"
                                                        : "Mark as used in interview"
                                                }
                                                onClick={() =>
                                                    toggleMutation.mutate({
                                                        docId: q.docId,
                                                        questionId: q._id,
                                                    })
                                                }
                                                disabled={toggleMutation.isPending}
                                            >
                                                {q.usedInInterview ? (
                                                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                                                ) : (
                                                    <Circle className="h-5 w-5 text-muted-foreground" />
                                                )}
                                            </button>

                                            {/* Question text + metadata */}
                                            <div className="flex-1 space-y-2">
                                                <p className="text-sm leading-relaxed">
                                                    {q.question}
                                                </p>

                                                <div className="flex flex-wrap items-center gap-2">
                                                    {/* Category chip */}
                                                    <span
                                                        className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                                                            CATEGORY_COLORS[q.category] ?? CATEGORY_COLORS.general
                                                        }`}
                                                    >
                                                        {q.category}
                                                    </span>

                                                    {/* Difficulty */}
                                                    <Badge variant="outline" className="text-xs capitalize">
                                                        {q.difficulty}
                                                    </Badge>

                                                    {/* Candidate context */}
                                                    <span className="text-xs text-muted-foreground">
                                                        {q.candidateName}
                                                        {q.score !== null ? ` · ${q.score}/100` : ""}
                                                    </span>

                                                    {/* Used badge */}
                                                    {q.usedInInterview && (
                                                        <Badge
                                                            variant="secondary"
                                                            className="text-xs text-green-600 dark:text-green-400 border-green-200 dark:border-green-800"
                                                        >
                                                            ✓ Used in interview
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </TabsContent>
                    ))}
                </Tabs>
            )}
        </div>
    );
}
