import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle } from "lucide-react";

export default function SkillsDisplay({ matchedSkills = [], missingSkills = [] }) {
  return (
    <div className="space-y-4">
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
