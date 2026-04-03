import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).nullable().optional(),
  trigger: z.enum(["status_change", "assignment", "legal_hold", "warranty_expiry", "asset_created", "note_added"]).optional(),
  conditions: z.record(z.string(), z.unknown()).optional(),
  recipients: z.object({
    type: z.enum(["assignee", "performer", "role", "country_leads", "emails"]),
    role: z.string().optional(),
    addresses: z.array(z.string().email()).optional(),
  }).optional(),
  subject: z.string().min(1).max(500).optional(),
  bodyHtml: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
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

  return NextResponse.json({ success: true, data: rule });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "GLOBAL_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  const existing = await prisma.notificationRule.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updated = await prisma.notificationRule.update({
    where: { id },
    data: parsed.data as any,
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "GLOBAL_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.notificationRule.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  if (existing.isSystem) {
    return NextResponse.json(
      { success: false, error: "System notification rules cannot be deleted. You can disable them instead." },
      { status: 422 }
    );
  }

  await prisma.notificationRule.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
