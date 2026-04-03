"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Lock, User, Mail, Globe, Calendar, Clock } from "lucide-react";

type Props = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
    lastLogin: string | null;
    country: string | null;
  };
};

const ROLE_LABELS: Record<string, string> = {
  GLOBAL_ADMIN: "Global Admin",
  COUNTRY_LEAD: "Country Lead",
  TECHNICIAN: "Technician",
};

export function ProfileForm({ user }: Props) {
  const [name, setName] = useState(user.name);
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name === user.name) return;
    setSavingName(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const data = await res.json();
    setSavingName(false);
    if (data.success) toast.success("Name updated. Sign in again to see the change in the sidebar.");
    else toast.error(data.error ?? "Failed to update name.");
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setSavingPassword(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setSavingPassword(false);
    if (data.success) {
      toast.success("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      toast.error(data.error ?? "Failed to change password.");
    }
  }

  return (
    <div className="space-y-5">
      {/* Account info card */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-brand-500" />
          Account Information
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm mb-5">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Mail className="w-3 h-3" /> Email</p>
            <p className="font-medium text-foreground">{user.email}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><User className="w-3 h-3" /> Role</p>
            <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold bg-brand-100 text-brand-800">
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
          </div>
          {user.country && (
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Globe className="w-3 h-3" /> Country</p>
              <p className="font-medium text-foreground">{user.country}</p>
            </div>
          )}
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Member since</p>
            <p className="font-medium text-foreground">{user.createdAt}</p>
          </div>
          {user.lastLogin && (
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Clock className="w-3 h-3" /> Last login</p>
              <p className="font-medium text-foreground">{user.lastLogin}</p>
            </div>
          )}
        </div>

        {/* Edit display name */}
        <div className="border-t border-border pt-4">
          <form onSubmit={saveName} className="flex items-end gap-3">
            <div className="flex-1 space-y-1">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={savingName || !name.trim() || name === user.name}
              className="bg-brand-800 text-white hover:bg-brand-900"
            >
              {savingName ? "Saving…" : "Save name"}
            </Button>
          </form>
        </div>
      </div>

      {/* Change password card */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-brand-500" />
          Change Password
        </h2>
        <form onSubmit={changePassword} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                autoComplete="new-password"
              />
            </div>
          </div>

          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-destructive">Passwords do not match.</p>
          )}

          {/* Password strength bar */}
          {newPassword && (
            <div className="space-y-1">
              <div className="flex gap-1 h-1">
                {[8, 12, 16].map((threshold, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-full transition-colors ${
                      newPassword.length >= threshold
                        ? i === 0 ? "bg-amber-400" : i === 1 ? "bg-brand-300" : "bg-emerald-400"
                        : "bg-border"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {newPassword.length < 8 ? "Too short" : newPassword.length < 12 ? "Acceptable" : newPassword.length < 16 ? "Good" : "Strong"}
              </p>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              size="sm"
              disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
              className="bg-brand-800 text-white hover:bg-brand-900"
            >
              {savingPassword ? "Changing…" : "Change password"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
