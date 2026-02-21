import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  company: z.string().optional(),
  role: z.enum(["recruiter", "hiring_manager", "admin"]).optional(),
  inviteCode: z.string().optional(),
});

export const jobSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  company: z.string().min(1, "Company is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  requirements: z.string().optional(),
  skills: z.string().optional(), // Comma-separated, parsed before submit
  location: z.string().optional(),
  type: z.enum(["full-time", "part-time", "contract", "internship", "remote"]).optional(),
  salaryRange: z.string().optional(),
  status: z.enum(["open", "closed", "draft"]).optional(),
});

export const resumeUploadSchema = z.object({
  candidateName: z.string().min(1, "Candidate name is required"),
  candidateEmail: z.string().email("Invalid email").optional().or(z.literal("")),
});
