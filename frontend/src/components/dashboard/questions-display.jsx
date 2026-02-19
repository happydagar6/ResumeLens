import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const categoryColors = {
  technical: "default",
  behavioral: "secondary",
  situational: "outline",
  experience: "default",
  general: "outline",
};

const difficultyColors = {
  easy: "text-green-600",
  medium: "text-yellow-600",
  hard: "text-red-500",
};

export default function QuestionsDisplay({ questions = [] }) {
  if (questions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No questions generated yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {questions.map((q, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {i + 1}
                </span>
                <p className="text-sm">{q.question}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Badge variant={categoryColors[q.category] || "outline"} className="text-xs">
                  {q.category}
                </Badge>
                <span className={`text-xs font-medium ${difficultyColors[q.difficulty] || ""}`}>
                  {q.difficulty}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
