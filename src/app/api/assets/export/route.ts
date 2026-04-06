import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AssetStatus, Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

function countryFilter(role: string, countryId: string | null): Prisma.AssetWhereInput {
  if (role === "GLOBAL_ADMIN") return {};
  const cid = countryId ?? "__none__";
  return {
    location: {
      OR: [{ id: cid }, { parentId: cid }, { parent: { parentId: cid } }],
    },
  };
}

const CONDITION_LABELS: Record<string, string> = {
  NEW: "New", GOOD: "Good", FAIR: "Fair", DAMAGED: "Damaged", FOR_PARTS: "For Parts",
};

const STATUS_LABELS: Record<string, string> = {
  IN_STOCK: "In Stock", DEPLOYED: "Deployed", IN_MAINTENANCE: "In Maintenance",
  PENDING_RETURN: "Pending Return", LEGAL_HOLD: "Legal Hold", RETIRED: "Retired", DISPOSED: "Disposed",
};

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const status = url.searchParams.get("status") ?? "";
  const format = url.searchParams.get("format") ?? "xlsx"; // "xlsx" | "csv"

  const geo = countryFilter(session.user.role, session.user.countryId);
  const where: Prisma.AssetWhereInput = {
    ...geo,
    ...(status ? { status: status as AssetStatus } : {}),
    ...(q ? {
      OR: [
        { serialNumber: { contains: q, mode: "insensitive" } },
        { assetTag: { contains: q, mode: "insensitive" } },
        { deviceName: { contains: q, mode: "insensitive" } },
        { manufacturer: { contains: q, mode: "insensitive" } },
        { model: { contains: q, mode: "insensitive" } },
        { processor: { contains: q, mode: "insensitive" } },
        { ram: { contains: q, mode: "insensitive" } },
        { storage: { contains: q, mode: "insensitive" } },
        { os: { contains: q, mode: "insensitive" } },
        { type: { name: { contains: q, mode: "insensitive" } } },
        { location: { name: { contains: q, mode: "insensitive" } } },
        { location: { parent: { name: { contains: q, mode: "insensitive" } } } },
        { assignments: { some: { isActive: true, assignedTo: { name: { contains: q, mode: "insensitive" } } } } },
      ],
    } : {}),
  };

  const assets = await prisma.asset.findMany({
    where,
    select: {
      serialNumber: true,
      assetTag: true,
      deviceName: true,
      status: true,
      condition: true,
      manufacturer: true,
      model: true,
      processor: true,
      ram: true,
      storage: true,
      os: true,
      purchaseDate: true,
      purchasePrice: true,
      warrantyExpiry: true,
      createdAt: true,
      type: { select: { name: true } },
      location: { select: { name: true, parent: { select: { name: true } } } },
      assignments: {
        where: { isActive: true },
        take: 1,
        select: { assignedTo: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10000, // safety cap
  });

  const rows = assets.map((a) => ({
    "Serial Number": a.serialNumber,
    "Asset Tag": a.assetTag ?? "",
    "Device Name": a.deviceName ?? "",
    "Type": a.type.name,
    "Status": STATUS_LABELS[a.status] ?? a.status,
    "Condition": CONDITION_LABELS[a.condition] ?? a.condition,
    "Manufacturer": a.manufacturer,
    "Model": a.model,
    "Processor": a.processor ?? "",
    "RAM": a.ram ?? "",
    "Storage": a.storage ?? "",
    "OS": a.os ?? "",
    "Location": a.location
      ? a.location.parent ? `${a.location.parent.name} / ${a.location.name}` : a.location.name
      : "",
    "Assigned To": a.assignments[0]?.assignedTo.name ?? "",
    "Purchase Date": a.purchaseDate ? a.purchaseDate.toISOString().slice(0, 10) : "",
    "Purchase Price": a.purchasePrice != null ? Number(a.purchasePrice) : "",
    "Warranty Expiry": a.warrantyExpiry ? a.warrantyExpiry.toISOString().slice(0, 10) : "",
    "Created At": a.createdAt.toISOString().slice(0, 10),
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-width columns
  const colWidths = Object.keys(rows[0] ?? {}).map((key) => ({
    wch: Math.max(key.length, ...rows.map((r) => String(r[key as keyof typeof r] ?? "").length)) + 2,
  }));
  ws["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, "Assets");

  const date = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    const csv = XLSX.utils.sheet_to_csv(ws);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="assetcore_export_${date}.csv"`,
      },
    });
  }

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="assetcore_export_${date}.xlsx"`,
    },
  });
}
