import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, DollarSign, Users, Brain } from "lucide-react";

const statusColors = {
  open: "default",
  closed: "secondary",
  draft: "outline",
};

const typeLabels = {
  "full-time": "Full Time",
  "part-time": "Part Time",
  contract: "Contract",
  internship: "Internship",
  remote: "Remote",
};

export default function JobCard({ job }) {
  return (
    <Link href={`/jobs/${job._id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="text-lg">{job.title}</CardTitle>
              <CardDescription className="text-sm">{job.company}</CardDescription>
            </div>
            <Badge variant={statusColors[job.status] || "outline"}>
              {job.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {job.description}
          </p>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {job.location}
              </span>
            )}
            {job.type && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {typeLabels[job.type] || job.type}
              </span>
            )}
            {job.salaryRange && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {job.salaryRange}
              </span>
            )}
          </div>
          {job.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {job.skills.slice(0, 4).map((skill) => (
                <Badge key={skill} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {job.skills.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{job.skills.length - 4}
                </Badge>
              )}
            </div>
          )}

          {/* Candidate count badges */}
          {(job.resumeCount != null || job.screenedCount != null) && (
            <div className="flex gap-3 pt-1 text-xs text-muted-foreground border-t">
              {job.resumeCount != null && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {job.resumeCount} applicant{job.resumeCount !== 1 ? "s" : ""}
                </span>
              )}
              {job.screenedCount != null && (
                <span className="flex items-center gap-1">
                  <Brain className="h-3 w-3" />
                  {job.screenedCount} screened
                </span>
              )}
              {job.shortlistedCount != null && job.shortlistedCount > 0 && (
                <span className="flex items-center gap-1 text-green-600">
                  {job.shortlistedCount} shortlisted
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
