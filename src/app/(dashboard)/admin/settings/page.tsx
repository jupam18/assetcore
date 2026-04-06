import { prisma } from "@/lib/prisma";
import { SettingsForm } from "./settings-form";

export default async function AdminSettingsPage() {
  const settings = await prisma.systemSetting.findMany({
    orderBy: [{ group: "asc" }, { key: "asc" }],
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">System Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Global configuration for AssetCore.
        </p>
      </div>
      <SettingsForm settings={settings} />
    </div>
  );
}
