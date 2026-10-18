"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  MessageSquare,
  Send,
  Trash2,
  Loader2,
  Briefcase,
  DollarSign,
  CheckCircle2,
  Tag,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  useScreeningNotes,
  useAddScreeningNote,
  useDeleteScreeningNote,
} from "@/hooks/use-screening";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Visual style definitions and icons for note categories
const CATEGORY_CONFIG = {
  general: {
    label: "General",
    color: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
    icon: Tag,
  },
  interview: {
    label: "Interview",
    color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300",
    icon: Briefcase,
  },
  salary: {
    label: "Compensation",
    color: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300",
    icon: DollarSign,
  },
  decision: {
    label: "Decision",
    color: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300",
    icon: CheckCircle2,
  },
};

// Visual badge styling based on user role
const ROLE_LABELS = {
  admin: { label: "Admin", badge: "border-red-500/40 text-red-600 dark:text-red-400" },
  hiring_manager: { label: "Hiring Manager", badge: "border-indigo-500/40 text-indigo-600 dark:text-indigo-400" },
  recruiter: { label: "Recruiter", badge: "border-sky-500/40 text-sky-600 dark:text-sky-400" },
};

export default function CandidateNotes({ screeningId, resumeId }) {
  // Current authenticated user session
  const { user } = useAuth();

  // Local state for composer form and active deletion action
  const [text, setText] = useState("");
  const [category, setCategory] = useState("general");
  const [deletingNoteId, setDeletingNoteId] = useState(null);

  // TanStack React Query hooks for fetching and mutating notes
  const { notes, isLoading } = useScreeningNotes(screeningId);
  const addNoteMutation = useAddScreeningNote();
  const deleteNoteMutation = useDeleteScreeningNote();

  // Handler to submit a new note
  const handleAddNote = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    addNoteMutation.mutate(
      {
        screeningId,
        text: trimmed,
        category,
        resumeId, // Passing resumeId invalidates the candidate activity audit log as well
      },
      {
        onSuccess: () => {
          setText(""); // Reset textarea
          setCategory("general"); // Reset category to default
        },
      }
    );
  };

  // Handler to delete an existing note
  const handleDeleteNote = (noteId) => {
    if (!confirm("Are you sure you want to delete this internal note?")) return;
    setDeletingNoteId(noteId);

    deleteNoteMutation.mutate(
      { screeningId, noteId },
      {
        onSettled: () => setDeletingNoteId(null),
      }
    );
  };

  // Helper function to extract user initials for the avatar fallback
  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  // Logged in user identifiers for permission validation
  const currentUserId = user?.id || user?._id;
  const isAdmin = user?.role === "admin";

  // Reverse array copy so newest notes appear at the top of the feed
  const sortedNotes = [...notes].reverse();

  return (
    <Card className="shadow-xs border-border/80">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Team Collaboration & Notes
              </CardTitle>
              <CardDescription className="text-xs">
                Internal feedback, salary negotiations & interview notes (not visible to candidate).
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs font-mono">
            {notes.length} {notes.length === 1 ? "note" : "notes"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ── 1. Composer: Add Note Form ── */}
        <form onSubmit={handleAddNote} className="space-y-3 rounded-lg border bg-muted/20 p-3.5">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add internal feedback, salary expectations, interview notes..."
            rows={3}
            className="bg-background resize-none text-sm leading-relaxed"
            disabled={addNoteMutation.isPending}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {/* Category Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Category:</span>
              <Select
                value={category}
                onValueChange={setCategory}
                disabled={addNoteMutation.isPending}
              >
                <SelectTrigger className="h-8 text-xs w-[150px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Note</SelectItem>
                  <SelectItem value="interview">Interview Feedback</SelectItem>
                  <SelectItem value="salary">Compensation</SelectItem>
                  <SelectItem value="decision">Hiring Decision</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              size="sm"
              disabled={addNoteMutation.isPending || !text.trim()}
              className="h-8 gap-1.5 text-xs font-medium"
            >
              {addNoteMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Post Note
                </>
              )}
            </Button>
          </div>
        </form>

        {/* ── 2. Notes Feed ── */}
        {isLoading ? (
          <div className="space-y-3 py-4">
            <p className="text-xs text-muted-foreground animate-pulse text-center">
              Loading team notes...
            </p>
          </div>
        ) : sortedNotes.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <div className="rounded-full bg-muted/60 p-3 mb-2">
              <MessageSquare className="h-5 w-5 text-muted-foreground/70" />
            </div>
            <p className="text-sm font-medium">No team notes yet</p>
            <p className="text-xs max-w-sm mt-0.5 text-muted-foreground/80">
              Be the first to share notes on compensation, interview rounds, or candidate evaluation.
            </p>
          </div>
        ) : (
          /* Populated Notes List */
          <div className="space-y-3.5">
            {sortedNotes.map((note) => {
              const authorObj = note.author || {};
              const authorId = authorObj._id || authorObj.id || (typeof note.author === "string" ? note.author : null);
              const authorName = authorObj.name || "Team Member";
              const authorRole = authorObj.role || "recruiter";

              // Authorization: note can only be deleted by its creator or an admin
              const canDelete = isAdmin || (currentUserId && authorId?.toString() === currentUserId.toString());

              const catConfig = CATEGORY_CONFIG[note.category] || CATEGORY_CONFIG.general;
              const CatIcon = catConfig.icon;
              const roleMeta = ROLE_LABELS[authorRole] || ROLE_LABELS.recruiter;
              const isDeleting = deletingNoteId === note._id;

              return (
                <div
                  key={note._id}
                  className="group relative rounded-lg border bg-card p-4 transition-all hover:border-border hover:shadow-xs"
                >
                  {/* Note Header: Author, Role Badge, Timestamp, Category, Delete Button */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      {/* Author Avatar */}
                      <Avatar className="h-7 w-7 text-xs border">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-[11px]">
                          {getInitials(authorName)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Author Identity */}
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-semibold leading-none text-foreground">
                            {authorName}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${roleMeta.badge}`}>
                            {roleMeta.label}
                          </span>
                        </div>
                        <time className="text-[11px] text-muted-foreground mt-0.5 block">
                          {note.createdAt
                            ? format(new Date(note.createdAt), "MMM d, yyyy • h:mm a")
                            : "Just now"}
                        </time>
                      </div>
                    </div>

                    {/* Category Badge & Action Button */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${catConfig.color}`}
                      >
                        <CatIcon className="h-3 w-3" />
                        {catConfig.label}
                      </span>

                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteNote(note._id)}
                          disabled={isDeleting}
                          className="h-7 w-7 opacity-70 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-opacity"
                          title="Delete note"
                        >
                          {isDeleting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Note Body Text with preserved line breaks */}
                  <div className="mt-2.5 pl-9.5 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {note.text}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
