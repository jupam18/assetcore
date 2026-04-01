import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AssetStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
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
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const { q = "", status = "", page = "1" } = await searchParams;
  const pageNum = Math.max(1, Number(page));
  const limit = 50;
  const skip = (pageNum - 1) * limit;

  const geo = countryWhere(session!.user.role, session!.user.countryId);
  const where = {
    ...geo,
    ...(status ? { status: status as AssetStatus } : {}),
    ...(q
      ? {
          OR: [
            { serialNumber: { contains: q, mode: "insensitive" as const } },
            { assetTag: { contains: q, mode: "insensitive" as const } },
            { deviceName: { contains: q, mode: "insensitive" as const } },
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Assets</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total.toLocaleString()} asset{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/assets/new" className={cn(buttonVariants(), "gap-1.5")}>
          <Plus className="w-4 h-4" />
          Add Asset
        </Link>
      </div>

      <AssetsTable
        assets={assets}
        total={total}
        page={pageNum}
        limit={limit}
        query={q}
        statusFilter={status}
        assetTypes={assetTypes}
      />
    </div>
  );
}
