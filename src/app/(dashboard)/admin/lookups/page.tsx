import { prisma } from "@/lib/prisma";
import { LookupManager } from "./lookup-manager";
import { LocationManager } from "./location-manager";

export default async function AdminLookupsPage() {
  const lists = await prisma.lookupList.findMany({
    include: {
      _count: { select: { values: { where: { isActive: true } } } },
    },
    orderBy: { label: "asc" },
  });

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Lookup Lists</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage the dropdown values used throughout AssetCore.
        </p>
      </div>

      <LookupManager lists={lists} />

      <div className="border-t border-border pt-8">
        <h2 className="text-xl font-semibold text-foreground tracking-tight">Locations</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-6">
          Manage countries and offices. Active locations appear in asset dropdowns.
        </p>
        <LocationManager />
      </div>
    </div>
  );
}
