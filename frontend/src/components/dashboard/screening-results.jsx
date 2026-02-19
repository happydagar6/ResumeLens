import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ScoreGauge from "./score-gauge";
import Link from "next/link";

const recommendationLabels = {
  strong_yes: { label: "Strong Yes", variant: "default" },
  yes: { label: "Yes", variant: "default" },
  maybe: { label: "Maybe", variant: "secondary" },
  no: { label: "No", variant: "outline" },
  strong_no: { label: "Strong No", variant: "destructive" },
};

export default function ScreeningResults({ screenings }) {
  if (!screenings || screenings.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No screening results yet. Go to a job detail page to screen resumes.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Candidate</TableHead>
          <TableHead>Score</TableHead>
          <TableHead>Matched Skills</TableHead>
          <TableHead>Recommendation</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {screenings.map((s) => {
          const rec = recommendationLabels[s.recommendation] || recommendationLabels.maybe;
          return (
            <TableRow key={s._id}>
              <TableCell>
                <div>
                  <p className="font-medium">
                    {s.resumeId?.candidateName || "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.resumeId?.candidateEmail || ""}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <ScoreGauge score={s.overallScore} />
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1 max-w-xs">
                  {(s.matchedSkills || []).slice(0, 3).map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {(s.matchedSkills || []).length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{s.matchedSkills.length - 3}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={rec.variant}>{rec.label}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/screening/${s._id}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  View Details
                </Link>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
