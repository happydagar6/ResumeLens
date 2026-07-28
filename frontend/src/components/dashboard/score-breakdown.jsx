import { Progress } from "@/components/ui/progress";

// This component receives the `scoreBreakdown` object from the database
export default function ScoreBreakdown({ breakdown }) {
  if (!breakdown) return null;

  return (
    <div className="mt-6 space-y-4 border-t pt-6">
      <h3 className="text-sm font-semibold">Detailed Breakdown</h3>
      
      {/* Loop through each of our 3 dimensions */}
      {['technical', 'experience', 'culture'].map((key) => {
        const item = breakdown[key];
        if (!item) return null;
        
        return (
          <div key={key} className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="capitalize font-medium">{key} Match</span>
              <span className="font-bold">{item.score}/100</span>
            </div>
            {/* Standard UI Progress bar */}
            <Progress value={item.score} className="h-2" />
            {/* The AI's 1-sentence reasoning */}
            <p className="text-xs text-muted-foreground">{item.rationale}</p>
          </div>
        );
      })}
    </div>
  );
}
