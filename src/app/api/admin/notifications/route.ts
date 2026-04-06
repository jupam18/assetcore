import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  trigger: z.enum(["status_change", "assignment", "legal_hold", "warranty_expiry", "asset_created", "note_added"]),
  conditions: z.record(z.string(), z.unknown()).optional(),
  recipients: z.object({
    type: z.enum(["assignee", "performer", "role", "country_leads", "emails"]),
    role: z.string().optional(),
    addresses: z.array(z.string().email()).optional(),
  }),
  subject: z.string().min(1).max(500),
  bodyHtml: z.string().min(1),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "GLOBAL_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const rules = await prisma.notificationRule.findMany({
    orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ success: true, data: rules });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "GLOBAL_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rule = await prisma.notificationRule.create({
    data: {
      ...parsed.data,
      conditions: (parsed.data.conditions ?? {}) as any,
      recipients: parsed.data.recipients as any,
      isSystem: false,
    },
  });

  return NextResponse.json({ success: true, data: rule }, { status: 201 });
}
