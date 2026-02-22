import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, DollarSign, Users, Brain } from "lucide-react";

const typeLabels = {
  "full-time": "Full Time",
  "part-time": "Part Time",
  contract: "Contract",
  internship: "Internship",
  remote: "Remote",
};

const statusGradients = {
  open:   "from-emerald-500 to-teal-500",
  closed: "from-slate-400 to-slate-500",
  draft:  "from-amber-400 to-orange-400",
};

export default function JobCard({ job }) {
  return (
    <Link href={`/jobs/${job._id}`}>
      <Card className="group relative overflow-hidden border border-border/60 bg-card card-hover cursor-pointer h-full">
        {/* Colored top accent bar */}
        <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${statusGradients[job.status] ?? "from-primary to-violet-500"}`} />
        <CardHeader className="pt-5">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="text-base font-bold group-hover:text-primary transition-colors">{job.title}</CardTitle>
              <CardDescription className="text-sm font-medium">{job.company}</CardDescription>
            </div>
            <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize text-white bg-gradient-to-r ${statusGradients[job.status] ?? "from-primary to-violet-500"} shadow-sm`}>
              {job.status}
            </span>
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
                <span key={skill} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary border border-primary/20">
                  {skill}
                </span>
              ))}
              {job.skills.length > 4 && (
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground border">
                  +{job.skills.length - 4}
                </span>
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
