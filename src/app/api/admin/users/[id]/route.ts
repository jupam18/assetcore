import { auditLog } from "@/lib/audit";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateUserSchema } from "@/lib/validations/user";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "GLOBAL_ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

  // Prevent deactivating yourself
  if (id === session.user.id && "isActive" in (await req.clone().json())) {
    const body = await req.json();
    if (body.isActive === false) {
      return NextResponse.json({ success: false, error: "You cannot deactivate your own account." }, { status: 422 });
    }
  }

  const body = await req.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: parsed.data,
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  const fieldChanges: Record<string, { old: unknown; new: unknown }> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (existing[key as keyof typeof existing] !== value) {
      fieldChanges[key] = {
        old: existing[key as keyof typeof existing],
        new: value,
      };
    }
  }

  await auditLog({
    entityType: "User",
    entityId: id,
    action: "UPDATE",
    performedById: session.user.id,
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    fieldChanges,
  });

  return NextResponse.json({ success: true, data: updated });
}
