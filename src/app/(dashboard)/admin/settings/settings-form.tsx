"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SystemSetting } from "@prisma/client";
import { useState } from "react";
import { toast } from "sonner";

const settingLabels: Record<string, string> = {
  app_name: "Application Name",
  default_timezone: "Default Timezone",
  session_timeout: "Session Timeout (minutes)",
  warranty_alert_days: "Warranty Alert Days",
};

export function SettingsForm({ settings }: { settings: SystemSetting[] }) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(settings.map((s) => [s.key, s.value]))
  );
  const [saving, setSaving] = useState(false);

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

    if (data.success) {
      toast.success("Settings saved.");
    } else {
      toast.error(data.error ?? "Failed to save settings.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {settings.map((setting) => (
        <div key={setting.key} className="space-y-1">
          <Label htmlFor={setting.key}>
            {settingLabels[setting.key] ?? setting.label}
          </Label>
          <Input
            id={setting.key}
            type={setting.type === "number" ? "number" : "text"}
            value={values[setting.key] ?? ""}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, [setting.key]: e.target.value }))
            }
          />
        </div>
      ))}

      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save Settings"}
      </Button>
    </form>
  );
}
