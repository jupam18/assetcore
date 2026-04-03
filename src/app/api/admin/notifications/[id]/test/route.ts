import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * Send a test email for a specific notification rule using sample data.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "GLOBAL_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const rule = await prisma.notificationRule.findUnique({ where: { id } });
  if (!rule) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  // Replace placeholders with sample data
  const replacements: Record<string, string> = {
    "{{asset.serialNumber}}": "SN-TEST-001",
    "{{asset.model}}": "ThinkPad T14 Gen 4",
    "{{asset.deviceName}}": "Test Device",
    "{{asset.assetTag}}": "TEST-TAG-001",
    "{{asset.type}}": "Notebook",
    "{{performer.name}}": session.user.name ?? "Test User",
    "{{performer.email}}": session.user.email ?? "",
    "{{assignee.name}}": "Jane Doe",
    "{{assignee.email}}": "jane@example.com",
    "{{fromStatus}}": "In Stock",
    "{{toStatus}}": "Deployed",
    "{{notes}}": "This is a test notification",
    "{{appUrl}}": appUrl,
    "{{count}}": "3",
    "{{days}}": "90",
    "{{warrantyTable}}": "<p style='color:#6b7280;font-size:13px'>[Warranty table would appear here]</p>",
  };

  let subject = rule.subject;
  let body = rule.bodyHtml;
  for (const [key, val] of Object.entries(replacements)) {
    subject = subject.replaceAll(key, val);
    body = body.replaceAll(key, val);
  }

  // Remove Handlebars-style conditionals for test
  body = body.replace(/\{\{#if .*?\}\}/g, "").replace(/\{\{\/if\}\}/g, "");

  const result = await sendEmail({
    to: session.user.email!,
    subject: `[TEST] ${subject}`,
    html: body,
  });

  if (result.success) {
    // Log the test
    await prisma.notificationLog.create({
      data: {
        ruleId: id,
        ruleName: rule.name,
        trigger: "test",
        recipient: session.user.email!,
        subject: `[TEST] ${subject}`,
        status: "sent",
      },
    });

    return NextResponse.json({ success: true, message: `Test email sent to ${session.user.email}` });
  } else {
    return NextResponse.json({ success: false, error: result.error ?? "Send failed" }, { status: 500 });
  }
}
