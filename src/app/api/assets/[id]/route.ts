import { auditLog } from "@/lib/audit";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateAssetSchema } from "@/lib/validations/asset";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      type: true,
      location: { include: { parent: true } },
      assignments: {
        where: { isActive: true },
        include: { assignedTo: { select: { id: true, name: true, email: true } } },
        take: 1,
      },
    },
  });

  if (!asset) return NextResponse.json({ success: false, error: "Asset not found" }, { status: 404 });

  return NextResponse.json({ success: true, data: asset });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.asset.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ success: false, error: "Asset not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateAssetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { purchaseDate, warrantyExpiry, ...rest } = parsed.data;

  const updated = await prisma.asset.update({
    where: { id },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: {
      ...rest,
      ...(purchaseDate !== undefined ? { purchaseDate: purchaseDate ? new Date(purchaseDate) : null } : {}),
      ...(warrantyExpiry !== undefined ? { warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null } : {}),
    } as any,
  });

  // Build field changes for audit
  const fieldChanges: Record<string, { old: unknown; new: unknown }> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (existing[key as keyof typeof existing] !== value) {
      fieldChanges[key] = { old: existing[key as keyof typeof existing], new: value };
    }
  }

  await auditLog({
    entityType: "Asset",
    entityId: id,
    action: "UPDATE",
    assetId: id,
    performedById: session.user.id,
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    fieldChanges,
  });

  return NextResponse.json({ success: true, data: updated });
}
