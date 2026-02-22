import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle } from "lucide-react";

export default function SkillsDisplay({ matchedSkills = [], missingSkills = [] }) {
  const total = matchedSkills.length + missingSkills.length;
  const matchPct = total > 0 ? Math.round((matchedSkills.length / total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Segmented progress bar */}
      {total > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{matchedSkills.length} matched</span>
            <span className="font-medium">{matchPct}%</span>
            <span>{missingSkills.length} missing</span>
          </div>
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${matchPct}%` }}
            />
            <div
              className="h-full bg-red-400 transition-all"
              style={{ width: `${100 - matchPct}%` }}
            />
          </div>
        </div>
      )}

      {matchedSkills.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Matched Skills
          </div>
          <div className="flex flex-wrap gap-1.5">
            {matchedSkills.map((skill) => (
              <Badge key={skill} variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {missingSkills.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <XCircle className="h-4 w-4 text-red-500" />
            Missing Skills
          </div>
          <div className="flex flex-wrap gap-1.5">
            {missingSkills.map((skill) => (
              <Badge key={skill} variant="outline" className="border-red-200 text-red-700 dark:border-red-800 dark:text-red-400">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
