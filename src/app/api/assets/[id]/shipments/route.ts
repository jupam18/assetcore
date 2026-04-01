import { auditLog } from "@/lib/audit";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createShipmentSchema } from "@/lib/validations/asset";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const shipments = await prisma.shipment.findMany({
    where: { assetId: id },
    include: { receivedBy: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: shipments });
}

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
  const parsed = createShipmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  const shipment = await prisma.shipment.create({
    data: {
      assetId: id,
      ...parsed.data,
      shipmentDate: parsed.data.shipmentDate ? new Date(parsed.data.shipmentDate) : null,
      expectedDelivery: parsed.data.expectedDelivery ? new Date(parsed.data.expectedDelivery) : null,
    },
  });

  await auditLog({
    entityType: "Shipment",
    entityId: shipment.id,
    action: "CREATE",
    assetId: id,
    performedById: session.user.id,
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    notes: `Shipment created${parsed.data.trackingNumber ? `: ${parsed.data.trackingNumber}` : ""}`,
  });

  return NextResponse.json({ success: true, data: shipment }, { status: 201 });
}
