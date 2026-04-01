import { auditLog } from "@/lib/audit";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TRANSITIONS } from "@/lib/workflow";
import { statusTransitionSchema } from "@/lib/validations/asset";
import { AssetStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) return NextResponse.json({ success: false, error: "Asset not found" }, { status: 404 });

  const body = await req.json();
  const parsed = statusTransitionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { toStatus, assignedToId, notes } = parsed.data;
  const fromStatus = asset.status;

  // Validate transition
  const isReleasingLegalHold = fromStatus === "LEGAL_HOLD" && toStatus === ("__RESTORE__" as AssetStatus);
  const actualToStatus: AssetStatus = isReleasingLegalHold
    ? ((asset.previousStatus as AssetStatus) ?? "IN_STOCK")
    : toStatus;

  if (!isReleasingLegalHold) {
    if (toStatus === "LEGAL_HOLD" && session.user.role !== "GLOBAL_ADMIN") {
      return NextResponse.json({ success: false, error: "Only Global Admins can place assets on Legal Hold." }, { status: 403 });
    }
    const allowed = TRANSITIONS[fromStatus] ?? [];
    if (!allowed.includes(toStatus) && toStatus !== "LEGAL_HOLD") {
      return NextResponse.json(
        { success: false, error: `Cannot transition from ${fromStatus} to ${toStatus}.` },
        { status: 422 }
      );
    }
  } else {
    if (session.user.role !== "GLOBAL_ADMIN") {
      return NextResponse.json({ success: false, error: "Only Global Admins can release Legal Hold." }, { status: 403 });
    }
  }

  // Deploy requires assignedToId
  if (actualToStatus === "DEPLOYED" && !assignedToId) {
    return NextResponse.json({ success: false, error: "assignedToId is required when deploying." }, { status: 400 });
  }

  const now = new Date();

  // Build update payload
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {
    status: actualToStatus,
    currentStatus: actualToStatus.toLowerCase(),
  };

  if (actualToStatus === "LEGAL_HOLD") {
    updateData.previousStatus = fromStatus;
  } else if (isReleasingLegalHold) {
    updateData.previousStatus = null;
  }

  if (actualToStatus === "DEPLOYED") {
    updateData.deployedDate = now;
  }

  if (
    actualToStatus === "IN_STOCK" &&
    (fromStatus === "DEPLOYED" || fromStatus === "PENDING_RETURN")
  ) {
    updateData.returnDate = now;
  }

  await prisma.$transaction(async (tx) => {
    await tx.asset.update({ where: { id }, data: updateData });

    // Create assignment on deploy
    if (actualToStatus === "DEPLOYED" && assignedToId) {
      await tx.assignment.create({
        data: {
          assetId: id,
          assignedToId,
          assignedById: session.user.id,
          deployedDate: now,
          isActive: true,
        },
      });
    }

    // Close assignment on return
    if (
      actualToStatus === "IN_STOCK" &&
      (fromStatus === "DEPLOYED" || fromStatus === "PENDING_RETURN")
    ) {
      await tx.assignment.updateMany({
        where: { assetId: id, isActive: true },
        data: { isActive: false, returnDate: now },
      });
    }

    await auditLog({
      entityType: "Asset",
      entityId: id,
      action: "STATUS_CHANGE",
      assetId: id,
      performedById: session.user.id,
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
      notes: notes ?? `Status: ${fromStatus} → ${actualToStatus}`,
      fieldChanges: {
        status: { old: fromStatus, new: actualToStatus },
      },
    });
  });

  const updated = await prisma.asset.findUnique({ where: { id } });
  return NextResponse.json({ success: true, data: updated });
}
