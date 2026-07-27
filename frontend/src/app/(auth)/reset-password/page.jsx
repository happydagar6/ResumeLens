"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { fetchUser } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset token. Please request a new link.");
    }
  }, [token]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setError("Passwords do not match");
    }
    if (password.length < 6) {
      return setError("Password must be at least 6 characters");
    }

    setIsSubmitting(true);
    setError("");

    try {
      await api.post("/auth/reset-password", { token, password });
      toast.success("Password reset successfully!");
      await fetchUser(); // Updates the UI state because the backend just logged us in
      router.push("/dashboard"); // Redirect to dashboard immediately
    } catch (err) {
      setError(err.message || "Invalid or expired token.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="mx-auto w-full max-w-sm space-y-6 text-center">
        <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Set New Password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your new password below.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Reset Password
        </Button>
      </form>
    </div>
  );
}
