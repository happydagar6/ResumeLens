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
            ]).then(([screeningData, questionData]) => {
                setScreening(screeningData.data.screening);
                setQuestions(questionData?.data?.questions || null);
            }).catch(() => {})
              .finally(() => setLoading(false));
        }
    }, [params.id]);

    const handleGenerateQuestions = async () => {
        setGenerating(true);
        try {
            const data = await questionsAPI.generate({ screeningId: params.id });
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
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    const score = screening?.overallScore || 0;
    const scoreColor = score >= 70 ? "text-success" : score >= 50 ? "text-warning" : "text-error";
    const scoreBg = score >= 70 ? "bg-success-light" : score >= 50 ? "bg-warning-light" : "bg-error-light";

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-6 h-16 flex items-center gap-3">
                    <Link href="/" className="text-xl font-bold text-foreground tracking-tight">
                        Recruit<span className="text-primary">AI</span>
                    </Link>
                    <span className="text-border">/</span>
                    <span className="text-sm text-foreground font-medium">Screening Result</span>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-8">
                {/* Score Card */}
                <div className="bg-card border border-border rounded-xl p-8 mb-6 shadow-sm text-center">
                    <p className="text-sm text-muted-foreground mb-1">
                        {screening?.resumeId?.candidateName || "Candidate"} • {screening?.jobId?.title || "Job"}
                    </p>
                    <div className={`text-6xl font-bold ${scoreColor} my-3`}>
                        {score}%
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">Match Score</p>
                    <span className={`inline-block text-xs font-semibold px-4 py-1.5 rounded-full ${scoreBg} ${scoreColor}`}>
                        {screening?.recommendation?.replace("_", " ").toUpperCase() || "N/A"}
                    </span>
                </div>

                {/* Skills */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <span className="w-5 h-5 bg-success-light rounded flex items-center justify-center text-xs">✓</span>
                            Matched Skills
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                            {screening?.matchedSkills?.length > 0 ? screening.matchedSkills.map((s, i) => (
                                <span key={i} className="text-xs bg-success-light text-success px-2.5 py-0.5 rounded-md font-medium">{s}</span>
                            )) : <span className="text-sm text-muted-foreground">None identified</span>}
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <span className="w-5 h-5 bg-error-light rounded flex items-center justify-center text-xs">✕</span>
                            Missing Skills
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                            {screening?.missingSkills?.length > 0 ? screening.missingSkills.map((s, i) => (
                                <span key={i} className="text-xs bg-error-light text-error px-2.5 py-0.5 rounded-md font-medium">{s}</span>
                            )) : <span className="text-sm text-muted-foreground">None identified</span>}
                        </div>
                    </div>
                </div>

                {/* Strengths / Weaknesses */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                        <h3 className="text-sm font-semibold text-foreground mb-2">Strengths</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{screening?.strengths || "N/A"}</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                        <h3 className="text-sm font-semibold text-foreground mb-2">Areas for Improvement</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{screening?.weaknesses || "N/A"}</p>
                    </div>
                </div>

                {/* Interview Questions */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-foreground">Interview Questions</h3>
                        {!questions && (
                            <button onClick={handleGenerateQuestions} disabled={generating}
                                className="h-9 px-4 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 shadow-sm">
                                {generating ? "Generating..." : "Generate Questions"}
                            </button>
                        )}
                    </div>

                    {questions?.questions?.length > 0 ? (
                        <div className="space-y-3">
                            {questions.questions.map((q, i) => (
                                <div key={i} className="bg-background border border-border rounded-lg p-4">
                                    <p className="text-sm text-foreground font-medium leading-relaxed">{i + 1}. {q.question}</p>
                                    <div className="flex gap-2 mt-2.5">
                                        <span className="text-xs bg-primary-light text-primary px-2 py-0.5 rounded font-medium">{q.category}</span>
                                        <span className="text-xs bg-warning-light text-warning px-2 py-0.5 rounded font-medium">{q.difficulty}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <p className="text-sm text-muted-foreground">No questions generated yet. Click the button above to create personalized interview questions.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
