import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AssetCondition, AssetStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { AssetsTable } from "./assets-table";

function countryWhere(role: string, countryId: string | null) {
  if (role === "GLOBAL_ADMIN") return {};
  if (!countryId) return { id: "__none__" };
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

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; condition?: string; typeId?: string; page?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const { q = "", status = "", condition = "", typeId = "", page = "1" } = await searchParams;
  const pageNum = Math.max(1, Number(page));
  const limit = 50;
  const skip = (pageNum - 1) * limit;

  const geo = countryWhere(session!.user.role, session!.user.countryId);
  const where = {
    ...geo,
    ...(status ? { status: status as AssetStatus } : {}),
    ...(condition ? { condition: condition as AssetCondition } : {}),
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

  const [assets, total, assetTypes] = await Promise.all([
    prisma.asset.findMany({
      where,
      select: {
        id: true,
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
      skip,
      take: limit,
    }),
    prisma.asset.count({ where }),
    prisma.assetType.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const serialized = assets.map((a) => ({
    ...a,
    purchaseDate: a.purchaseDate?.toISOString() ?? null,
    warrantyExpiry: a.warrantyExpiry?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
    purchasePrice: a.purchasePrice ? Number(a.purchasePrice) : null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Assets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total.toLocaleString()} asset{total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/assets/import"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border bg-card text-foreground text-sm font-medium transition-all hover:bg-secondary"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </Link>
          <Link
            href="/assets/new"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-brand-800 text-white text-sm font-medium transition-all hover:bg-brand-900 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Asset
          </Link>
        </div>
      </div>

      <AssetsTable
        assets={serialized}
        total={total}
        page={pageNum}
        limit={limit}
        query={q}
        statusFilter={status}
        conditionFilter={condition}
        typeIdFilter={typeId}
        assetTypes={assetTypes}
        userRole={session!.user.role}
        userId={session!.user.id}
      />
    </div>
  );
}
