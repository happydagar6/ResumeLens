import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MapPin, Clock, DollarSign, Users, Brain, MoreHorizontal, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { useDeleteJob } from "@/hooks/use-jobs";

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
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const deleteJob = useDeleteJob();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <Card className="group relative overflow-hidden border border-border/60 bg-card card-hover h-full">
      {/* Colored top accent bar */}
      <div className={`absolute inset-x-0 top-0 h-1 bg-linear-to-r ${statusGradients[job.status] ?? "from-primary to-violet-500"} z-0`} />
      <CardHeader className="pt-5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 relative z-10">
            <CardTitle className="text-base font-bold group-hover:text-primary transition-colors">
              <Link href={`/jobs/${job._id}`} className="after:absolute after:inset-0 after:z-0">
                {job.title}
              </Link>
            </CardTitle>
            <CardDescription className="text-sm font-medium">{job.company}</CardDescription>
          </div>
          <div className="flex items-center gap-2 relative z-20">
            <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize text-white bg-linear-to-r ${statusGradients[job.status] ?? "from-primary to-violet-500"} shadow-sm`}>
              {job.status}
            </span>
            
            {/* Actions Menu */}
            {(isAdmin || job.createdBy === user?.id) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 relative z-30">
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                    onSelect={(e) => {
                      e.preventDefault();
                      setShowDeleteDialog(true);
                    }}
                    disabled={deleteJob.isPending}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Job
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* AlertDialog placed outside the link structure where possible, or just carefully stopping propagation */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the job "{job.title}" and remove all associated resumes and screenings.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={(e) => {
                      deleteJob.mutate(job._id);
                      setShowDeleteDialog(false);
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 relative z-10 pointer-events-none">
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
  );
}
