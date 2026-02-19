import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export default function ScoreGauge({ score, size = "default" }) {
  const getColor = (value) => {
    if (value >= 80) return "text-green-600";
    if (value >= 60) return "text-yellow-600";
    if (value >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getProgressColor = (value) => {
    if (value >= 80) return "[&>div]:bg-green-600";
    if (value >= 60) return "[&>div]:bg-yellow-600";
    if (value >= 40) return "[&>div]:bg-orange-500";
    return "[&>div]:bg-red-500";
  };

  return (
    <div className="space-y-1">
      <div className="flex items-end gap-1">
        <span
          className={cn(
            "font-bold",
            getColor(score),
            size === "lg" ? "text-3xl" : "text-xl"
          )}
        >
          {score}
        </span>
        <span className="text-sm text-muted-foreground mb-0.5">/100</span>
      </div>
      <Progress value={score} className={cn("h-2", getProgressColor(score))} />
    </div>
  );
}
