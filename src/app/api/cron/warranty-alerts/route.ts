import { prisma } from "@/lib/prisma";
import { sendEmail, warrantyAlertHtml } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";

// Called by an external cron scheduler (e.g. Vercel Cron, cron-job.org)
// Secured by a shared secret in CRON_SECRET env var.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  // Read warranty_alert_days from system settings (default 90)
  const setting = await prisma.systemSetting.findUnique({ where: { key: "warranty_alert_days" } });
  const days = parseInt(setting?.value ?? "90", 10);

  const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const assets = await prisma.asset.findMany({
    where: {
      warrantyExpiry: { gte: new Date(), lte: cutoff },
      status: { notIn: ["RETIRED", "DISPOSED"] },
    },
    select: {
      serialNumber: true,
      model: true,
      warrantyExpiry: true,
      location: { select: { name: true, parent: { select: { name: true } } } },
    },
    orderBy: { warrantyExpiry: "asc" },
  });

  if (assets.length === 0) {
    return NextResponse.json({ success: true, sent: 0, message: "No expiring warranties" });
  }

  // Collect GLOBAL_ADMIN emails
  const admins = await prisma.user.findMany({
    where: { role: "GLOBAL_ADMIN", isActive: true },
    select: { email: true },
  });

  if (admins.length === 0) {
    return NextResponse.json({ success: true, sent: 0, message: "No admin recipients" });
  }

  const rows = assets.map((a) => ({
    serialNumber: a.serialNumber,
    model: a.model,
    warrantyExpiry: a.warrantyExpiry!.toISOString().slice(0, 10),
    location: a.location
      ? a.location.parent ? `${a.location.parent.name} / ${a.location.name}` : a.location.name
      : "—",
  }));

  const html = warrantyAlertHtml(rows);
  const to = admins.map((a) => a.email);

  const result = await sendEmail({
    to,
    subject: `AssetCore — ${assets.length} warranty${assets.length !== 1 ? "ies" : "y"} expiring within ${days} days`,
    html,
  });

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  }

  // Log the notification in audit log
  await prisma.auditLog.create({
    data: {
      entityType: "System",
      entityId: "warranty-alert",
      action: "UPDATE",
      notes: `Warranty alert sent to ${to.length} admin(s) for ${assets.length} asset(s) expiring within ${days} days`,
    },
  });

  return NextResponse.json({ success: true, sent: assets.length, recipients: to.length });
}

// Allow GET for manual trigger via browser (dev convenience)
export async function GET(req: NextRequest) {
  return POST(req);
}
