// src/components/dashboard/bias-report.jsx
// Renders the full bias detection report for a job description.
// Receives biasFlags from the job detail page (job.biasFlags).
// Shows bias score, category breakdown, per-flag suggestions, and summary.

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";

// ── Color helpers ──────────────────────────────────────────────────────────────
// biasScore is 0-100 where 100 = completely neutral.
// We map score ranges to visual colors.
function scoreColor(score) {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
}

function scoreBg(score) {
    if (score >= 80) return "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800";
    if (score >= 60) return "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800";
    if (score >= 40) return "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800";
    return "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800";
}

function scoreLabel(score) {
    if (score >= 80) return "Low Bias";
    if (score >= 60) return "Moderate Bias";
    if (score >= 40) return "Significant Bias";
    return "High Bias";
}

// ── Category badge colors ──────────────────────────────────────────────────────
const CATEGORY_STYLES = {
    gender:        "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
    age:           "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    culture:       "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    socioeconomic: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    ability:       "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
};

const CATEGORY_LABELS = {
    gender:        "Gender",
    age:           "Age",
    culture:       "Culture",
    socioeconomic: "Socioeconomic",
    ability:       "Ability",
};

// ── Severity badge ─────────────────────────────────────────────────────────────
const SEVERITY_STYLES = {
    low:    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    high:   "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

// ── Main Component ─────────────────────────────────────────────────────────────
// biasFlags: the full object from job.biasFlags (from MongoDB)
//   { biasScore, flagCount, flags, summary, analyzedAt }
export default function BiasReport({ biasFlags }) {
    if (!biasFlags) return null;

    const { biasScore, flags = [], summary, analyzedAt } = biasFlags;
    const hasFlags = flags.length > 0;

    // Count flags per category for the summary row
    const categoryCounts = flags.reduce((acc, flag) => {
        acc[flag.category] = (acc[flag.category] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="space-y-4">
            {/* Score card */}
            <div className={`rounded-lg border p-4 ${scoreBg(biasScore)}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {biasScore >= 80 ? (
                            <CheckCircle2 className={`h-8 w-8 ${scoreColor(biasScore)}`} />
                        ) : (
                            <AlertTriangle className={`h-8 w-8 ${scoreColor(biasScore)}`} />
                        )}
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Inclusivity Score</p>
                            <p className={`text-3xl font-bold ${scoreColor(biasScore)}`}>
                                {biasScore}<span className="text-lg font-normal">/100</span>
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className={`text-lg font-semibold ${scoreColor(biasScore)}`}>
                            {scoreLabel(biasScore)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {flags.length} issue{flags.length !== 1 ? "s" : ""} detected
                        </p>
                        {analyzedAt && (
                            <p className="text-xs text-muted-foreground">
                                Last analyzed:{" "}
                                {new Date(analyzedAt).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                })}
                            </p>
                        )}
                    </div>
                </div>

                {/* Summary text */}
                {summary && (
                    <p className="mt-3 text-sm text-muted-foreground border-t pt-3 border-current/20">
                        {summary}
                    </p>
                )}
            </div>

            {/* Category breakdown badges */}
            {Object.keys(categoryCounts).length > 0 && (
                <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-muted-foreground self-center">Categories detected:</span>
                    {Object.entries(categoryCounts).map(([category, count]) => (
                        <span
                            key={category}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${CATEGORY_STYLES[category]}`}
                        >
                            {CATEGORY_LABELS[category]} ({count})
                        </span>
                    ))}
                </div>
            )}

            {/* No flags state */}
            {!hasFlags && (
                <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700 dark:text-green-400 text-sm">
                        No biased language detected. This job description appears to be inclusive and welcoming to all qualified candidates.
                    </AlertDescription>
                </Alert>
            )}

            {/* Per-flag breakdown */}
            {hasFlags && (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Flagged Terms
                    </h3>
                    {flags.map((flag, i) => (
                        <Card key={i} className="border-l-4 border-l-orange-400 dark:border-l-orange-500">
                            <CardContent className="pt-4 pb-3 space-y-2">
                                {/* Term + category + severity */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <code className="rounded bg-muted px-2 py-0.5 text-sm font-mono font-semibold">
                                        {flag.term}
                                    </code>
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_STYLES[flag.category]}`}>
                                        {CATEGORY_LABELS[flag.category]}
                                    </span>
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_STYLES[flag.severity]}`}>
                                        {flag.severity} severity
                                    </span>
                                </div>

                                {/* Context sentence */}
                                {flag.context && (
                                    <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-2">
                                        …{flag.context}…
                                    </p>
                                )}

                                {/* Suggestion */}
                                <div className="flex items-start gap-2 text-sm">
                                    <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                                    <span>
                                        <span className="font-medium">Suggestion: </span>
                                        <span className="text-muted-foreground">{flag.suggestion}</span>
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}