import { prisma } from "@/lib/prisma";
import { LookupManager } from "./lookup-manager";

export default async function AdminLookupsPage() {
  const lists = await prisma.lookupList.findMany({
    include: {
      _count: { select: { values: { where: { isActive: true } } } },
    },
    orderBy: { label: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Lookup Lists</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage the dropdown values used throughout AssetCore.
        </p>
      </div>
      <LookupManager lists={lists} />
    </div>
  );
}
