import { auditLog } from "@/lib/audit";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { statusTransitionSchema } from "@/lib/validations/asset";
import {
  findTransition,
  getWorkflowForAsset,
  recordTransition,
} from "@/lib/workflow-engine";
import { fireNotifications } from "@/lib/notification-engine";
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

  const asset = await prisma.asset.findUnique({
    where: { id },
    include: { type: { select: { name: true } } },
  });
  if (!asset) return NextResponse.json({ success: false, error: "Asset not found" }, { status: 404 });

  const body = await req.json();
  const parsed = statusTransitionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { toStatus, assignedToId, notes } = parsed.data;
  const fromStatus = asset.status;

  // Load workflow for this asset
  const workflow = await getWorkflowForAsset(id);
  if (!workflow) {
    return NextResponse.json({ success: false, error: "No workflow found for this asset." }, { status: 422 });
  }

  // Legal Hold release — special path
  const isReleasingLegalHold =
    fromStatus === "LEGAL_HOLD" && toStatus === ("__RESTORE__" as AssetStatus);

  const actualToStatus: AssetStatus = isReleasingLegalHold
    ? ((asset.previousStatus as AssetStatus) ?? "IN_STOCK")
    : toStatus;

  if (isReleasingLegalHold) {
    const releaseTrans = workflow.transitions.find(
      (t) =>
        (t.from === "legal_hold" || t.from === "*") &&
        t.to === "*" &&
        t.roles.includes(session.user.role)
    );
    if (!releaseTrans) {
      return NextResponse.json(
        { success: false, error: "You are not allowed to release Legal Hold." },
        { status: 403 }
      );
    }
  } else {
    const transition = findTransition(fromStatus, toStatus, session.user.role, workflow);
    if (!transition) {
      return NextResponse.json(
        { success: false, error: `Transition from ${fromStatus} to ${toStatus} is not allowed for your role.` },
        { status: 422 }
      );
    }
  }

  // Deploy requires an assignee
  if (actualToStatus === "DEPLOYED" && !assignedToId) {
    return NextResponse.json(
      { success: false, error: "assignedToId is required when deploying." },
      { status: 400 }
    );
  }

  const now = new Date();

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

  if (actualToStatus === "IN_STOCK" && (fromStatus === "DEPLOYED" || fromStatus === "PENDING_RETURN")) {
    updateData.returnDate = now;
  }

  await prisma.$transaction(async (tx) => {
    await tx.asset.update({ where: { id }, data: updateData });

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

    if (actualToStatus === "IN_STOCK" && (fromStatus === "DEPLOYED" || fromStatus === "PENDING_RETURN")) {
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
      fieldChanges: { status: { old: fromStatus, new: actualToStatus } },
    });
  });

  // Update WorkflowInstance outside the transaction (non-critical)
  await recordTransition(id, fromStatus, actualToStatus, session.user.id, notes).catch(() => null);

  // ── DB-driven email notifications (fire-and-forget) ─────────────────────────
  // Resolve assignee details if deploying
  let assigneeName: string | undefined;
  let assigneeEmail: string | undefined;
  if (actualToStatus === "DEPLOYED" && assignedToId) {
    const assignee = await prisma.user.findUnique({
      where: { id: assignedToId },
      select: { name: true, email: true },
    }).catch(() => null);
    if (assignee) {
      assigneeName = assignee.name;
      assigneeEmail = assignee.email;
    }
  }

  const performer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true },
  }).catch(() => null);

  fireNotifications({
    trigger: "status_change",
    asset: {
      id: asset.id,
      serialNumber: asset.serialNumber,
      model: asset.model,
      assetTag: asset.assetTag,
      deviceName: asset.deviceName,
      typeName: asset.type.name,
      locationId: asset.locationId,
    },
    performedById: session.user.id,
    performedByName: performer?.name ?? "A technician",
    fromStatus,
    toStatus: actualToStatus,
    assigneeId: assignedToId ?? undefined,
    assigneeName,
    assigneeEmail,
    notes,
  }).catch(() => null); // Never block the response

  const updated = await prisma.asset.findUnique({ where: { id } });
  return NextResponse.json({ success: true, data: updated });
}
