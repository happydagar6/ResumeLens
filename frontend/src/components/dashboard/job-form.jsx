"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { jobSchema } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export default function JobForm({ onSubmit, defaultValues = {}, submitLabel = "Create Job" }) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      title: "",
      company: "",
      description: "",
      requirements: "",
      skills: "",
      location: "",
      type: "full-time",
      salaryRange: "",
      status: "open",
      scoringWeights: { technical: 40, experience: 40, culture: 20 },
      ...defaultValues,
    },
  });

  const handleFormSubmit = (data) => {
    // Convert comma-separated skills to array
    const processed = {
      ...data,
      skills: data.skills
        ? data.skills.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
    };
    return onSubmit(processed);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Job Title *</Label>
          <Input id="title" placeholder="Senior React Developer" {...register("title")} />
          {errors.title && (
            <p className="text-xs text-destructive">{errors.title.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="company">Company *</Label>
          <Input id="company" placeholder="Acme Inc." {...register("company")} />
          {errors.company && (
            <p className="text-xs text-destructive">{errors.company.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Job Description *</Label>
        <Textarea
          id="description"
          placeholder="Describe the role, responsibilities, and ideal candidate..."
          rows={5}
          {...register("description")}
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="requirements">Requirements</Label>
        <Textarea
          id="requirements"
          placeholder="List key requirements..."
          rows={3}
          {...register("requirements")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="skills">Skills (comma-separated)</Label>
        <Input
          id="skills"
          placeholder="React, Node.js, TypeScript, MongoDB"
          {...register("skills")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" placeholder="New York, NY" {...register("location")} />
        </div>

        <div className="space-y-2">
          <Label>Job Type</Label>
          <Select
            defaultValue={defaultValues.type || "full-time"}
            onValueChange={(v) => setValue("type", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full-time">Full Time</SelectItem>
              <SelectItem value="part-time">Part Time</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
              <SelectItem value="internship">Internship</SelectItem>
              <SelectItem value="remote">Remote</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="salaryRange">Salary Range</Label>
          <Input
            id="salaryRange"
            placeholder="$80k - $120k"
            {...register("salaryRange")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select
          defaultValue={defaultValues.status || "open"}
          onValueChange={(v) => setValue("status", v)}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4 rounded-lg border border-border/50 bg-muted/20 p-4">
        <div>
          <h3 className="text-sm font-semibold">Custom AI Scoring Weights</h3>
          <p className="text-xs text-muted-foreground">Adjust how the AI grades resumes (Must equal 100%)</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="tech-weight">Technical (%)</Label>
            <Input id="tech-weight" type="number" {...register("scoringWeights.technical")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exp-weight">Experience (%)</Label>
            <Input id="exp-weight" type="number" {...register("scoringWeights.experience")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cult-weight">Culture (%)</Label>
            <Input id="cult-weight" type="number" {...register("scoringWeights.culture")} />
          </div>
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  );
}
