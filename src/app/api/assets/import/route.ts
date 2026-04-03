import { auditLog } from "@/lib/audit";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createWorkflowInstance, getDefaultWorkflow } from "@/lib/workflow-engine";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const rowSchema = z.object({
  serialNumber: z.string().min(1).max(100),
  assetTag: z.string().max(100).optional().nullable(),
  deviceName: z.string().max(200).optional().nullable(),
  assetType: z.string().min(1),        // matched by name
  manufacturer: z.string().min(1),
  model: z.string().min(1),
  condition: z.enum(["NEW", "GOOD", "FAIR", "DAMAGED", "FOR_PARTS"]),
  location: z.string().min(1),         // matched by office name
  processor: z.string().optional().nullable(),
  ram: z.string().optional().nullable(),
  storage: z.string().optional().nullable(),
  os: z.string().max(200).optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  purchasePrice: z.string().optional().nullable(),
  warrantyExpiry: z.string().optional().nullable(),
});

const bodySchema = z.object({
  rows: z.array(rowSchema).min(1).max(500),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  // Pre-load all reference data for validation
  const [assetTypes, locations, existingSerials, defaultWorkflow] = await Promise.all([
    prisma.assetType.findMany({ select: { id: true, name: true } }),
    prisma.location.findMany({
      where: { type: "OFFICE", isActive: true },
      select: { id: true, name: true },
    }),
    prisma.asset.findMany({ select: { serialNumber: true } }).then((a) => new Set(a.map((x) => x.serialNumber))),
    getDefaultWorkflow(),
  ]);

  const typeMap = new Map(assetTypes.map((t) => [t.name.toLowerCase(), t.id]));
  const locMap = new Map(locations.map((l) => [l.name.toLowerCase(), l.id]));

  const results: { row: number; serialNumber: string; status: "imported" | "failed"; error?: string }[] = [];
  let importedCount = 0;

  for (let i = 0; i < parsed.data.rows.length; i++) {
    const row = parsed.data.rows[i];
    const rowNum = i + 1;
    const sn = row.serialNumber.toUpperCase().trim();

    // Validate reference fields
    const typeId = typeMap.get(row.assetType.toLowerCase());
    if (!typeId) {
      results.push({ row: rowNum, serialNumber: sn, status: "failed", error: `Unknown asset type: "${row.assetType}"` });
      continue;
    }

    const locationId = locMap.get(row.location.toLowerCase());
    if (!locationId) {
      results.push({ row: rowNum, serialNumber: sn, status: "failed", error: `Unknown location: "${row.location}"` });
      continue;
    }

    if (existingSerials.has(sn)) {
      results.push({ row: rowNum, serialNumber: sn, status: "failed", error: `Serial number already exists: ${sn}` });
      continue;
    }

    // Parse optional numeric/date fields
    const purchasePrice = row.purchasePrice ? Number(row.purchasePrice) : null;
    if (row.purchasePrice && isNaN(purchasePrice!)) {
      results.push({ row: rowNum, serialNumber: sn, status: "failed", error: `Invalid purchase price: "${row.purchasePrice}"` });
      continue;
    }

    try {
      const asset = await prisma.asset.create({
        data: {
          serialNumber: sn,
          assetTag: row.assetTag || null,
          deviceName: row.deviceName || null,
          typeId,
          manufacturer: row.manufacturer,
          model: row.model,
          condition: row.condition,
          locationId,
          processor: row.processor || null,
          ram: row.ram || null,
          storage: row.storage || null,
          os: row.os || null,
          purchaseDate: row.purchaseDate ? new Date(row.purchaseDate) : null,
          purchasePrice: purchasePrice,
          warrantyExpiry: row.warrantyExpiry ? new Date(row.warrantyExpiry) : null,
          status: "IN_STOCK",
          currentStatus: "in_stock",
        },
      });

      await auditLog({
        entityType: "Asset",
        entityId: asset.id,
        action: "CREATE",
        assetId: asset.id,
        performedById: session.user.id,
        notes: `Imported via CSV (row ${rowNum})`,
      });

      if (defaultWorkflow) {
        await createWorkflowInstance(asset.id, session.user.id, defaultWorkflow.id);
      }

      existingSerials.add(sn); // prevent duplicates within same import
      results.push({ row: rowNum, serialNumber: sn, status: "imported" });
      importedCount++;
    } catch {
      results.push({ row: rowNum, serialNumber: sn, status: "failed", error: "Database error creating asset." });
    }
  }

  return NextResponse.json({
    success: true,
    data: { imported: importedCount, failed: results.filter((r) => r.status === "failed").length, results },
  });
}
