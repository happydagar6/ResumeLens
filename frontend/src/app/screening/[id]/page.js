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
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        );
    }

    const scoreColor = screening?.overallScore >= 70 ? "text-success" : screening?.overallScore >= 50 ? "text-warning" : "text-error";

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-4">
                    <Link href="/" className="text-xl font-bold text-foreground">
                        Recruit<span className="text-primary">AI</span>
                    </Link>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-sm text-foreground">Screening Result</span>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                {/* Score Overview */}
                <div className="bg-card border border-border rounded-2xl p-8 mb-8 text-center">
                    <h2 className="text-lg text-muted-foreground mb-2">
                        {screening?.resumeId?.candidateName || "Candidate"} — {screening?.jobId?.title || "Job"}
                    </h2>
                    <div className={`text-6xl font-bold ${scoreColor} mb-2`}>
                        {screening?.overallScore}%
                    </div>
                    <p className="text-muted-foreground">Match Score</p>
                    <span className={`inline-block mt-3 text-sm font-medium px-4 py-1.5 rounded-full ${
                        screening?.recommendation === "strong_yes" || screening?.recommendation === "yes"
                            ? "bg-success/10 text-success"
                            : screening?.recommendation === "maybe"
                            ? "bg-warning/10 text-warning"
                            : "bg-error/10 text-error"
                    }`}>
                        {screening?.recommendation?.replace("_", " ").toUpperCase()}
                    </span>
                </div>

                {/* Skills Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    <div className="bg-card border border-border rounded-xl p-5">
                        <h3 className="font-semibold text-foreground mb-3">✅ Matched Skills</h3>
                        <div className="flex flex-wrap gap-1.5">
                            {screening?.matchedSkills?.length > 0 ? screening.matchedSkills.map((s, i) => (
                                <span key={i} className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-md">{s}</span>
                            )) : <span className="text-sm text-muted-foreground">None identified</span>}
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-5">
                        <h3 className="font-semibold text-foreground mb-3">❌ Missing Skills</h3>
                        <div className="flex flex-wrap gap-1.5">
                            {screening?.missingSkills?.length > 0 ? screening.missingSkills.map((s, i) => (
                                <span key={i} className="text-xs bg-error/10 text-error px-2 py-0.5 rounded-md">{s}</span>
                            )) : <span className="text-sm text-muted-foreground">None identified</span>}
                        </div>
                    </div>
                </div>

                {/* Strengths / Weaknesses */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    <div className="bg-card border border-border rounded-xl p-5">
                        <h3 className="font-semibold text-foreground mb-2">💪 Strengths</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{screening?.strengths || "N/A"}</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-5">
                        <h3 className="font-semibold text-foreground mb-2">⚠️ Weaknesses</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{screening?.weaknesses || "N/A"}</p>
                    </div>
                </div>

                {/* Interview Questions */}
                <div className="bg-card border border-border rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-foreground">Interview Questions</h3>
                        {!questions && (
                            <button onClick={handleGenerateQuestions} disabled={generating}
                                className="h-9 px-4 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-50">
                                {generating ? "Generating..." : "Generate Questions"}
                            </button>
                        )}
                    </div>

                    {questions?.questions?.length > 0 ? (
                        <div className="space-y-3">
                            {questions.questions.map((q, i) => (
                                <div key={i} className="bg-muted rounded-xl p-4">
                                    <p className="text-foreground font-medium">{i + 1}. {q.question}</p>
                                    <div className="flex gap-2 mt-2">
                                        <span className="text-xs bg-primary/10 text-accent px-2 py-0.5 rounded-md">{q.category}</span>
                                        <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded-md">{q.difficulty}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-sm">No questions generated yet. Click the button above to create personalized interview questions.</p>
                    )}
                </div>
            </main>
        </div>
    );
}
