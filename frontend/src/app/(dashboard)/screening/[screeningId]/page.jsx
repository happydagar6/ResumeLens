"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import ScoreGauge from "@/components/dashboard/score-gauge";
import SkillsDisplay from "@/components/dashboard/skills-display";
import QuestionsDisplay from "@/components/dashboard/questions-display";
import { LoadingSpinner } from "@/components/common/loading-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Brain, Loader2, ThumbsUp, ThumbsDown } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const recommendationLabels = {
  strong_yes: { label: "Strong Yes", icon: ThumbsUp, color: "text-green-600" },
  yes: { label: "Yes", icon: ThumbsUp, color: "text-green-500" },
  maybe: { label: "Maybe", icon: null, color: "text-yellow-600" },
  no: { label: "No", icon: ThumbsDown, color: "text-orange-500" },
  strong_no: { label: "Strong No", icon: ThumbsDown, color: "text-red-500" },
};

export default function ScreeningDetailPage() {
  const { screeningId } = useParams();
  const [screening, setScreening] = useState(null);
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [screeningData, qData] = await Promise.allSettled([
          api.get(`/screening/${screeningId}`),
          api.get(`/questions/screening/${screeningId}`),
        ]);
        if (screeningData.status === "fulfilled") {
          setScreening(screeningData.value.data?.screening);
        }
        if (qData.status === "fulfilled") {
          setQuestions(qData.value.data?.questions);
        }
      } catch {
        // handled
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [screeningId]);

  const handleGenerateQuestions = async () => {
    try {
      setGenerating(true);
      const result = await api.post("/questions/generate", { screeningId });
      setQuestions(result.data?.interviewQuestion);
      toast.success("Interview questions generated!");
    } catch (err) {
      toast.error(err.message || "Failed to generate questions");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!screening) return <p className="text-muted-foreground">Screening not found.</p>;

  const rec = recommendationLabels[screening.recommendation] || recommendationLabels.maybe;
  const candidate = screening.resumeId;
  const job = screening.jobId;

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

      {/* Interview Questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Interview Questions</h2>
          {!questions && (
            <Button onClick={handleGenerateQuestions} disabled={generating}>
              {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Brain className="mr-2 h-4 w-4" />
              )}
              Generate Questions
            </Button>
          )}
        </div>

        <QuestionsDisplay questions={questions?.questions || []} />
      </div>
    </div>
  );
}
