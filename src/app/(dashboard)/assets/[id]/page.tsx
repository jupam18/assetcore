import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AssetTabs } from "./asset-tabs";

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  const [asset, assetTypes, locations, users] = await Promise.all([
    prisma.asset.findUnique({
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
    }),
    prisma.assetType.findMany({ orderBy: { name: "asc" } }),
    prisma.location.findMany({
      where: { type: { in: ["OFFICE", "ROOM"] } },
      include: { parent: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!asset) notFound();

  const [makeLookup, ramValues, storageValues, processorValues, carrierValues] =
    await Promise.all([
      prisma.lookupValue.findMany({
        where: { list: { name: "make" }, isActive: true },
        orderBy: [{ sortOrder: "asc" }, { value: "asc" }],
        select: { id: true, value: true },
      }),
      prisma.lookupValue.findMany({
        where: { list: { name: "ram" }, isActive: true },
        orderBy: [{ sortOrder: "asc" }, { value: "asc" }],
        select: { id: true, value: true },
      }),
      prisma.lookupValue.findMany({
        where: { list: { name: "storage" }, isActive: true },
        orderBy: [{ sortOrder: "asc" }, { value: "asc" }],
        select: { id: true, value: true },
      }),
      prisma.lookupValue.findMany({
        where: { list: { name: "processor" }, isActive: true },
        orderBy: [{ sortOrder: "asc" }, { value: "asc" }],
        select: { id: true, value: true },
      }),
      prisma.lookupValue.findMany({
        where: { list: { name: "carrier" }, isActive: true },
        orderBy: [{ sortOrder: "asc" }, { value: "asc" }],
        select: { id: true, value: true },
      }),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/assets"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 font-mono">
            {asset.serialNumber}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {asset.type.name}
            {asset.assetTag ? ` · ${asset.assetTag}` : ""}
          </p>
        </div>
      </div>

      <AssetTabs
        asset={asset}
        assetTypes={assetTypes}
        locations={locations}
        users={users}
        makeValues={makeLookup}
        ramValues={ramValues}
        storageValues={storageValues}
        processorValues={processorValues}
        carrierValues={carrierValues}
        userRole={session!.user.role}
        userId={session!.user.id}
      />
    </div>
  );
}
