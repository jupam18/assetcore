import { auditLog } from "@/lib/audit";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateLookupValueSchema } from "@/lib/validations/lookup";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; valueId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "GLOBAL_ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const { id, valueId } = await params;

  const existing = await prisma.lookupValue.findFirst({
    where: { id: valueId, listId: id },
  });
  if (!existing) return NextResponse.json({ success: false, error: "Value not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateLookupValueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  const updated = await prisma.lookupValue.update({
    where: { id: valueId },
    data: parsed.data,
  });

  await auditLog({
    entityType: "LookupValue",
    entityId: valueId,
    action: "UPDATE",
    performedById: session.user.id,
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ success: true, data: updated });
}
