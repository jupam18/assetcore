import { auditLog } from "@/lib/audit";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateSettingsSchema } from "@/lib/validations/settings";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "GLOBAL_ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const settings = await prisma.systemSetting.findMany({ orderBy: { group: "asc" } });
  return NextResponse.json({ success: true, data: settings });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "GLOBAL_ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  const results = await Promise.all(
    parsed.data.settings.map((s) =>
      prisma.systemSetting.update({
        where: { key: s.key },
        data: { value: s.value },
      })
    )
  );

  await auditLog({
    entityType: "SystemSetting",
    entityId: "system",
    action: "UPDATE",
    performedById: session.user.id,
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    notes: `Updated settings: ${parsed.data.settings.map((s) => s.key).join(", ")}`,
  });

  return NextResponse.json({ success: true, data: results });
}
