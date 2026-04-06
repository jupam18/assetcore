"use client";

import { SystemSetting } from "@prisma/client";
import { useState } from "react";
import { toast } from "sonner";
import { Mail, Loader2 } from "lucide-react";

const GROUP_LABELS: Record<string, string> = {
  general: "General",
  auth: "Authentication",
  email: "Email / SMTP",
};

const GROUP_DESCS: Record<string, string> = {
  general: "Core application settings",
  auth: "Session and security configuration",
  email: "SMTP server configuration for notifications",
};

export function SettingsForm({ settings }: { settings: SystemSetting[] }) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(settings.map((s) => [s.key, s.value]))
  );
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  async function sendTestEmail() {
    setTestingEmail(true);
    const res = await fetch("/api/admin/settings/test-email", { method: "POST" });
    const data = await res.json();
    setTestingEmail(false);
    if (data.success) toast.success(data.message ?? "Test email sent!");
    else toast.error(data.error ?? "Failed to send test email. Check your SMTP settings.");
  }

  const groups = settings.reduce<Record<string, SystemSetting[]>>((acc, s) => {
    const g = s.group ?? "general";
    if (!acc[g]) acc[g] = [];
    acc[g].push(s);
    return acc;
  }, {});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        settings: Object.entries(values).map(([key, value]) => ({ key, value })),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) toast.success("Settings saved");
    else toast.error(data.error ?? "Failed to save settings");
  }

  function inputType(setting: SystemSetting) {
    if (setting.key === "smtp_pass") return "password";
    if (setting.type === "number") return "number";
    return "text";
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {Object.entries(groups).map(([group, items]) => (
        <div key={group} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">{GROUP_LABELS[group] ?? group}</h2>
              {GROUP_DESCS[group] && <p className="text-xs text-muted-foreground mt-0.5">{GROUP_DESCS[group]}</p>}
            </div>
            {group === "email" && (
              <button
                type="button"
                onClick={sendTestEmail}
                disabled={testingEmail}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
              >
                {testingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                {testingEmail ? "Sending…" : "Send test email"}
              </button>
            )}
          </div>
          <div className="divide-y divide-border/50">
            {items.map((setting) => (
              <div key={setting.key} className="flex items-center gap-4 px-6 py-4">
                <label htmlFor={setting.key} className="text-sm font-medium text-foreground w-48 shrink-0">
                  {setting.label}
                </label>
                <div className="flex-1">
                  {setting.type === "boolean" ? (
                    <select
                      id={setting.key}
                      value={values[setting.key] ?? "false"}
                      onChange={(e) => setValues((prev) => ({ ...prev, [setting.key]: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-300/20"
                    >
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  ) : (
                    <input
                      id={setting.key}
                      type={inputType(setting)}
                      value={values[setting.key] ?? ""}
                      onChange={(e) => setValues((prev) => ({ ...prev, [setting.key]: e.target.value }))}
                      placeholder={setting.key === "smtp_pass" ? "Enter password" : undefined}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-300/20"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-brand-800 text-white text-sm font-medium hover:bg-brand-900 disabled:opacity-40 transition-all shadow-sm"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </form>
  );
}
