import { auditLog } from "@/lib/audit";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAssetSchema } from "@/lib/validations/asset";
import { createWorkflowInstance, getDefaultWorkflow } from "@/lib/workflow-engine";
import { fireNotifications } from "@/lib/notification-engine";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

function countryFilter(role: string, countryId: string | null) {
  if (role === "GLOBAL_ADMIN") return {};
  if (!countryId) return { id: "__none__" }; // no assets if no country set
  return {
    location: {
      OR: [
        { id: countryId },
        { parentId: countryId },
        { parent: { parentId: countryId } },
      ],
    },
  };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const typeId = searchParams.get("typeId") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 50)));
  const sort = searchParams.get("sort") ?? "createdAt";
  const order = (searchParams.get("order") ?? "desc") as "asc" | "desc";
  const skip = (page - 1) * limit;

  const geo = countryFilter(session.user.role, session.user.countryId);

  const where = {
    ...geo,
    ...(status ? { status: status as never } : {}),
    ...(typeId ? { typeId } : {}),
    ...(q
      ? {
          OR: [
            { serialNumber: { contains: q, mode: "insensitive" as const } },
            { assetTag: { contains: q, mode: "insensitive" as const } },
            { deviceName: { contains: q, mode: "insensitive" as const } },
            { manufacturer: { contains: q, mode: "insensitive" as const } },
            { model: { contains: q, mode: "insensitive" as const } },
            { processor: { contains: q, mode: "insensitive" as const } },
            { ram: { contains: q, mode: "insensitive" as const } },
            { storage: { contains: q, mode: "insensitive" as const } },
            { os: { contains: q, mode: "insensitive" as const } },
            { type: { name: { contains: q, mode: "insensitive" as const } } },
            { location: { name: { contains: q, mode: "insensitive" as const } } },
            { location: { parent: { name: { contains: q, mode: "insensitive" as const } } } },
            { assignments: { some: { isActive: true, assignedTo: { name: { contains: q, mode: "insensitive" as const } } } } },
          ],
        }
      : {}),
  };

  const validSortFields = ["createdAt", "serialNumber", "status", "condition"];
  const sortField = validSortFields.includes(sort) ? sort : "createdAt";

  const [assets, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      select: {
        id: true,
        serialNumber: true,
        assetTag: true,
        deviceName: true,
        status: true,
        condition: true,
        createdAt: true,
        deployedDate: true,
        type: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
        assignments: {
          where: { isActive: true },
          take: 1,
          select: { assignedTo: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { [sortField]: order },
      skip,
      take: limit,
    }),
    prisma.asset.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: { assets, total, page, limit, pages: Math.ceil(total / limit) },
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createAssetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { serialNumber, purchaseDate, purchasePrice, warrantyExpiry, ...rest } = parsed.data;

  const existing = await prisma.asset.findUnique({ where: { serialNumber } });
  if (existing) {
    return NextResponse.json(
      { success: false, error: "An asset with this serial number already exists." },
      { status: 422 }
    );
  }

  const asset = await prisma.asset.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: {
      ...rest,
      serialNumber,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      purchasePrice: purchasePrice ?? null,
      warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
      status: "IN_STOCK",
      currentStatus: "in_stock",
    } as any,
  });

  await auditLog({
    entityType: "Asset",
    entityId: asset.id,
    action: "CREATE",
    assetId: asset.id,
    performedById: session.user.id,
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    notes: `Asset created: ${serialNumber}`,
  });

  // Create WorkflowInstance for the default workflow
  const defaultWorkflow = await getDefaultWorkflow();
  if (defaultWorkflow) {
    await createWorkflowInstance(asset.id, session.user.id, defaultWorkflow.id);
  }

  // Fire "asset_created" notifications (fire-and-forget)
  fireNotifications({
    trigger: "asset_created",
    asset: {
      id: asset.id,
      serialNumber: asset.serialNumber,
      model: asset.model,
      assetTag: asset.assetTag,
      deviceName: asset.deviceName,
      typeName: rest.typeId, // Will be resolved by engine if needed
      locationId: asset.locationId,
    },
    performedById: session.user.id,
    performedByName: session.user.name ?? "A technician",
  }).catch(() => null);

  return NextResponse.json({ success: true, data: asset }, { status: 201 });
}
