import { prisma } from "@/lib/prisma";
import { AssetCreateForm } from "./asset-create-form";

export default async function NewAssetPage() {
  const [assetTypes, locations, makeLookup] = await Promise.all([
    prisma.assetType.findMany({ orderBy: { name: "asc" } }),
    prisma.location.findMany({
      where: { type: { in: ["OFFICE", "ROOM"] } },
      include: { parent: true },
      orderBy: { name: "asc" },
    }),
    prisma.lookupList.findUnique({
      where: { name: "make" },
      include: {
        values: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { value: "asc" }],
          select: { id: true, value: true },
        },
      },
    }),
  ]);

  const [ramValues, storageValues, processorValues] = await Promise.all([
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
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Add Asset</h1>
        <p className="text-sm text-gray-500 mt-1">
          New assets are always created with status <strong>In Stock</strong>.
        </p>
      </div>
      <AssetCreateForm
        assetTypes={assetTypes}
        locations={locations}
        makeValues={makeLookup?.values ?? []}
        ramValues={ramValues}
        storageValues={storageValues}
        processorValues={processorValues}
      />
    </div>
  );
}
