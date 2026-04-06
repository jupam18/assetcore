import { prisma } from "@/lib/prisma";
import { ImportWizard } from "./import-wizard";

export default async function ImportPage() {
  const [assetTypes, locations] = await Promise.all([
    prisma.assetType.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
    prisma.location.findMany({
      where: { type: "OFFICE", isActive: true },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Bulk Import Assets</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload a CSV file to import multiple assets at once. All imported assets start as <strong>In Stock</strong>.
        </p>
      </div>
      <ImportWizard
        assetTypes={assetTypes.map((t) => t.name)}
        locations={locations.map((l) => l.name)}
      />
    </div>
  );
}
