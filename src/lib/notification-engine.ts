import { prisma } from "./prisma";
import { sendEmail } from "./email";

const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

type AssetInfo = {
  id: string;
  serialNumber: string;
  model: string;
  assetTag?: string | null;
  deviceName?: string | null;
  typeName?: string;
  locationId?: string | null;
};

type TriggerContext = {
  trigger: "status_change" | "assignment" | "legal_hold" | "warranty_expiry" | "asset_created" | "note_added";
  asset: AssetInfo;
  performedById: string;
  performedByName: string;
  fromStatus?: string;
  toStatus?: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneeEmail?: string;
  notes?: string | null;
};

/**
 * Evaluate all active notification rules for a given trigger context.
 * Resolves recipients, replaces placeholders, sends emails, and logs results.
 * All operations are fire-and-forget — errors never propagate.
 */
export async function fireNotifications(ctx: TriggerContext): Promise<void> {
  try {
    const rules = await prisma.notificationRule.findMany({
      where: { trigger: ctx.trigger, isActive: true },
    });

    for (const rule of rules) {
      try {
        // Check conditions
        if (!matchesConditions(rule.conditions as Record<string, unknown> | null, ctx)) continue;

        // Resolve recipient emails
        const emails = await resolveRecipients(
          rule.recipients as Record<string, unknown>,
          ctx
        );
        if (emails.length === 0) continue;

        // Replace placeholders
        const subject = replacePlaceholders(rule.subject, ctx);
        const body = replacePlaceholders(rule.bodyHtml, ctx);

        // Send
        const result = await sendEmail({ to: emails, subject, html: body });

        // Log for each recipient
        for (const email of emails) {
          await prisma.notificationLog.create({
            data: {
              ruleId: rule.id,
              ruleName: rule.name,
              trigger: ctx.trigger,
              recipient: email,
              subject,
              status: result.success ? "sent" : "failed",
              error: result.error ?? null,
              assetId: ctx.asset.id,
            },
          }).catch(() => null);
        }
      } catch (err) {
        // Log individual rule failure
        console.error(`[notifications] Rule "${rule.name}" failed:`, err);
        await prisma.notificationLog.create({
          data: {
            ruleId: rule.id,
            ruleName: rule.name,
            trigger: ctx.trigger,
            recipient: "unknown",
            subject: rule.subject,
            status: "failed",
            error: err instanceof Error ? err.message : "Unknown error",
            assetId: ctx.asset.id,
          },
        }).catch(() => null);
      }
    }
  } catch (err) {
    console.error("[notifications] Engine failed:", err);
  }
}

function matchesConditions(
  conditions: Record<string, unknown> | null,
  ctx: TriggerContext
): boolean {
  if (!conditions || Object.keys(conditions).length === 0) return true;

  const toStatuses = conditions.toStatus as string[] | undefined;
  if (toStatuses && toStatuses.length > 0) {
    if (!ctx.toStatus || !toStatuses.includes(ctx.toStatus)) return false;
  }

  const fromStatuses = conditions.fromStatus as string[] | undefined;
  if (fromStatuses && fromStatuses.length > 0) {
    if (!ctx.fromStatus || !fromStatuses.includes(ctx.fromStatus)) return false;
  }

  return true;
}

async function resolveRecipients(
  recipients: Record<string, unknown>,
  ctx: TriggerContext
): Promise<string[]> {
  const type = recipients.type as string;

  switch (type) {
    case "assignee": {
      if (ctx.assigneeEmail) return [ctx.assigneeEmail];
      if (ctx.assigneeId) {
        const user = await prisma.user.findUnique({
          where: { id: ctx.assigneeId },
          select: { email: true },
        });
        return user ? [user.email] : [];
      }
      return [];
    }

    case "performer": {
      const user = await prisma.user.findUnique({
        where: { id: ctx.performedById },
        select: { email: true },
      });
      return user ? [user.email] : [];
    }

    case "role": {
      const role = recipients.role as string;
      if (!role) return [];
      const users = await prisma.user.findMany({
        where: { role: role as "GLOBAL_ADMIN" | "COUNTRY_LEAD" | "TECHNICIAN", isActive: true },
        select: { email: true },
      });
      return users.map((u) => u.email);
    }

    case "country_leads": {
      // Find the country for this asset's location
      if (!ctx.asset.locationId) return [];
      const loc = await prisma.location.findUnique({
        where: { id: ctx.asset.locationId },
        select: { type: true, id: true, parentId: true, parent: { select: { parentId: true } } },
      });
      if (!loc) return [];

      let countryId: string | null = null;
      if (loc.type === "COUNTRY") countryId = loc.id;
      else if (loc.type === "OFFICE") countryId = loc.parentId;
      else if (loc.type === "ROOM") countryId = loc.parent?.parentId ?? null;
      if (!countryId) return [];

      const leads = await prisma.user.findMany({
        where: { role: "COUNTRY_LEAD", countryId, isActive: true },
        select: { email: true },
      });
      return leads.map((l) => l.email);
    }

    case "emails": {
      return (recipients.addresses as string[]) ?? [];
    }

    default:
      return [];
  }
}

function replacePlaceholders(template: string, ctx: TriggerContext): string {
  const STATUS_LABELS: Record<string, string> = {
    IN_STOCK: "In Stock", DEPLOYED: "Deployed", IN_MAINTENANCE: "In Maintenance",
    PENDING_RETURN: "Pending Return", LEGAL_HOLD: "Legal Hold", RETIRED: "Retired", DISPOSED: "Disposed",
  };

  const replacements: Record<string, string> = {
    "{{asset.serialNumber}}": ctx.asset.serialNumber,
    "{{asset.model}}": ctx.asset.model,
    "{{asset.deviceName}}": ctx.asset.deviceName ?? ctx.asset.model,
    "{{asset.assetTag}}": ctx.asset.assetTag ?? "",
    "{{asset.type}}": ctx.asset.typeName ?? "",
    "{{performer.name}}": ctx.performedByName,
    "{{assignee.name}}": ctx.assigneeName ?? "",
    "{{assignee.email}}": ctx.assigneeEmail ?? "",
    "{{fromStatus}}": STATUS_LABELS[ctx.fromStatus ?? ""] ?? ctx.fromStatus ?? "",
    "{{toStatus}}": STATUS_LABELS[ctx.toStatus ?? ""] ?? ctx.toStatus ?? "",
    "{{notes}}": ctx.notes ?? "",
    "{{appUrl}}": APP_URL,
  };

  let result = template;
  for (const [key, val] of Object.entries(replacements)) {
    result = result.replaceAll(key, val);
  }

  // Handle {{#if notes}} ... {{/if}} blocks
  if (ctx.notes) {
    result = result.replace(/\{\{#if notes\}\}/g, "").replace(/\{\{\/if\}\}/g, "");
  } else {
    result = result.replace(/\{\{#if notes\}\}[\s\S]*?\{\{\/if\}\}/g, "");
  }

  return result;
}
