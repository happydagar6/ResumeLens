"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { screeningAPI, questionsAPI } from "@/lib/api";

export default function ScreeningDetailPage() {
    const params = useParams();
    const [screening, setScreening] = useState(null);
    const [questions, setQuestions] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        if (params.id) {
            Promise.all([
                screeningAPI.getById(params.id),
                questionsAPI.getByScreening(params.id).catch(() => null),
            ])
                .then(([screeningData, questionData]) => {
                    setScreening(screeningData.data.screening);
                    setQuestions(questionData?.data?.questions || null);
                })
                .catch(() => {})
                .finally(() => setLoading(false));
        }
    }, [params.id]);

    const handleGenerateQuestions = async () => {
        setGenerating(true);
        try {
            const data = await questionsAPI.generate({
                screeningId: params.id,
            });
            setQuestions(data.data.interviewQuestion);
        } catch (err) {
            alert(err.message);
        } finally {
            setGenerating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="text-center">
                    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-muted-foreground text-sm">Loading screening results...</p>
                </div>
            </div>
        );
    }

    const score = screening?.overallScore || 0;
    const scoreColor =
        score >= 70
            ? "text-success"
            : score >= 50
            ? "text-warning"
            : "text-error";
    const scoreBg =
        score >= 70
            ? "bg-success-light"
            : score >= 50
            ? "bg-warning-light"
            : "bg-error-light";
    const scoreRing =
        score >= 70
            ? "border-success/30"
            : score >= 50
            ? "border-warning/30"
            : "border-error/30";

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="bg-white border-b border-border/60 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-6 h-16 flex items-center gap-3">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">R</span>
                        </div>
                        <span className="text-lg font-bold text-foreground tracking-tight">
                            Recruit<span className="text-primary">AI</span>
                        </span>
                    </Link>
                    <span className="text-border text-lg">/</span>
                    <Link
                        href="/dashboard"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
                    >
                        Dashboard
                    </Link>
                    <span className="text-border text-lg">/</span>
                    <span className="text-sm text-foreground font-semibold">
                        Screening Result
                    </span>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-8">
                {/* Score Card */}
                <div className="bg-white border border-border/60 rounded-2xl p-10 mb-6 shadow-sm text-center">
                    <p className="text-sm text-muted-foreground font-medium mb-4">
                        {screening?.resumeId?.candidateName || "Candidate"} •{" "}
                        {screening?.jobId?.title || "Job"}
                    </p>
                    <div
                        className={`inline-flex items-center justify-center w-32 h-32 rounded-full border-4 ${scoreRing} ${scoreBg} mb-4`}
                    >
                        <span
                            className={`text-5xl font-extrabold ${scoreColor}`}
                        >
                            {score}
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                        Match Score out of 100
                    </p>
                    <span
                        className={`inline-block text-xs font-bold px-5 py-2 rounded-full uppercase tracking-wider ${scoreBg} ${scoreColor}`}
                    >
                        {screening?.recommendation
                            ?.replace(/_/g, " ")
                            .toUpperCase() || "N/A"}
                    </span>
                </div>

                {/* Skills */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                    <div className="bg-white border border-border/60 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 bg-success-light rounded-lg flex items-center justify-center text-success text-xs font-bold">
                                ✓
                            </span>
                            Matched Skills
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {screening?.matchedSkills?.length > 0 ? (
                                screening.matchedSkills.map((s, i) => (
                                    <span
                                        key={i}
                                        className="text-xs bg-success-light text-success px-3 py-1.5 rounded-lg font-semibold"
                                    >
                                        {s}
                                    </span>
                                ))
                            ) : (
                                <span className="text-sm text-muted-foreground">
                                    None identified
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="bg-white border border-border/60 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 bg-error-light rounded-lg flex items-center justify-center text-error text-xs font-bold">
                                ✕
                            </span>
                            Missing Skills
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {screening?.missingSkills?.length > 0 ? (
                                screening.missingSkills.map((s, i) => (
                                    <span
                                        key={i}
                                        className="text-xs bg-error-light text-error px-3 py-1.5 rounded-lg font-semibold"
                                    >
                                        {s}
                                    </span>
                                ))
                            ) : (
                                <span className="text-sm text-muted-foreground">
                                    None identified
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Strengths / Weaknesses */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                    <div className="bg-white border border-border/60 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                            <span className="text-success">💪</span> Strengths
                        </h3>
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                            {screening?.strengths || "N/A"}
                        </p>
                    </div>
                    <div className="bg-white border border-border/60 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                            <span className="text-warning">⚠️</span> Areas for
                            Improvement
                        </h3>
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                            {screening?.weaknesses || "N/A"}
                        </p>
                    </div>
                </div>

                {/* Interview Questions */}
                <div className="bg-white border border-border/60 rounded-2xl p-7 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                            <span>💬</span> Interview Questions
                        </h3>
                        {!questions && (
                            <button
                                onClick={handleGenerateQuestions}
                                disabled={generating}
                                className="inline-flex items-center gap-2 h-10 px-5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-50 shadow-sm"
                            >
                                {generating ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Generating...
                                    </>
                                ) : (
                                    <>🤖 Generate Questions</>
                                )}
                            </button>
                        )}
                    </div>

                    {questions?.questions?.length > 0 ? (
                        <div className="space-y-3">
                            {questions.questions.map((q, i) => (
                                <div
                                    key={i}
                                    className="bg-background border border-border/60 rounded-xl p-5"
                                >
                                    <p className="text-sm text-foreground font-semibold leading-relaxed mb-3">
                                        <span className="text-primary font-bold mr-2">
                                            Q{i + 1}.
                                        </span>
                                        {q.question}
                                    </p>
                                    <div className="flex gap-2">
                                        <span className="text-xs bg-primary-light text-primary px-2.5 py-1 rounded-lg font-semibold">
                                            {q.category}
                                        </span>
                                        <span
                                            className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${
                                                q.difficulty === "hard"
                                                    ? "bg-error-light text-error"
                                                    : q.difficulty === "medium"
                                                    ? "bg-warning-light text-warning"
                                                    : "bg-success-light text-success"
                                            }`}
                                        >
                                            {q.difficulty}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10">
                            <div className="w-16 h-16 bg-primary-light rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                                💬
                            </div>
                            <p className="text-foreground font-semibold mb-1">
                                No questions yet
                            </p>
                            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                                Click the button above to generate personalized
                                interview questions based on this screening.
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
