import { prisma } from "@/lib/prisma";
import { NotificationManager } from "./notification-manager";

export default async function NotificationsPage() {
  const [rules, recentLogs] = await Promise.all([
    prisma.notificationRule.findMany({
      orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
    }),
    prisma.notificationLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <NotificationManager
      initialRules={rules.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        trigger: r.trigger,
        conditions: r.conditions as Record<string, unknown> | null,
        recipients: r.recipients as Record<string, unknown>,
        subject: r.subject,
        bodyHtml: r.bodyHtml,
        isActive: r.isActive,
        isSystem: r.isSystem,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }))}
      initialLogs={recentLogs.map((l) => ({
        id: l.id,
        ruleId: l.ruleId,
        ruleName: l.ruleName,
        trigger: l.trigger,
        recipient: l.recipient,
        subject: l.subject,
        status: l.status,
        error: l.error,
        createdAt: l.createdAt.toISOString(),
      }))}
    />
  );
}
