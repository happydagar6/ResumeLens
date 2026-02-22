"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useUpdateProfile, useUpdatePassword } from "@/hooks/use-profile";
import { useInviteCode } from "@/hooks/use-invite-code";
import { usePermissions } from "@/hooks/use-permissions";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Users } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const { canAssignHiringManager } = usePermissions();
  const { inviteCode, orgName, isLoading: inviteLoading } = useInviteCode();
  const [copied, setCopied] = useState(false);

  // Team members
  const { data: teamData, isLoading: teamLoading } = useQuery({
    queryKey: ["team"],
    queryFn: () => api.get("/auth/team"),
    staleTime: 2 * 60 * 1000,
  });
  const teamMembers = teamData?.data?.members ?? [];

  function copyInviteCode() {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Profile form ────────────────────────────────────────────────────────────
  const [name, setName] = useState(user?.name ?? "");
  const [company, setCompany] = useState(user?.company ?? "");

  const updateProfile = useUpdateProfile();

  function handleProfileSubmit(e) {
    e.preventDefault();
    updateProfile.mutate({ name, company });
  }

  // ── Password form ───────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const updatePassword = useUpdatePassword();

  function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordError("");

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    updatePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        },
      }
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences.</p>
      </div>

      <Separator />

      {/* Team Invite Card — only visible to recruiters/admins who manage the org */}
      {canAssignHiringManager && (
        <Card>
          <CardHeader>
            <CardTitle>Team Invite</CardTitle>
            <CardDescription>
              Share this code with hiring managers so they can join your organization{orgName ? ` (${orgName})` : ""}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {inviteLoading ? (
              <p className="text-sm text-muted-foreground">Loading invite code…</p>
            ) : inviteCode ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={inviteCode}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={copyInviteCode}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Hiring managers enter this code on signup to join your organization. Keep it private.
                </p>
              </div>
            ) : (
              <p className="text-sm text-destructive">Could not load invite code.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your display name and company.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            {/* Email — read-only */}
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={user?.email ?? ""} disabled />
              <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
            </div>

            {/* Role — read-only */}
            <div className="space-y-1">
              <Label>Role</Label>
              <Input
                value={
                  user?.role === "hiring_manager"
                    ? "Hiring Manager"
                    : user?.role
                    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                    : ""
                }
                disabled
              />
            </div>

            {/* Name */}
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                required
                minLength={2}
              />
            </div>

            {/* Company */}
            <div className="space-y-1">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Your company (optional)"
              />
            </div>

            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password Card */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Choose a strong password with at least 6 characters.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}

            <Button type="submit" disabled={updatePassword.isPending}>
              {updatePassword.isPending ? "Updating…" : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
