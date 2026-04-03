import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { ReportsDashboard } from "./reports-dashboard";
import { STATUS_LABELS } from "@/lib/workflow";
import { AssetStatus } from "@prisma/client";

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  const isAdmin = session!.user.role === "GLOBAL_ADMIN";
  const countryId = session!.user.countryId;

  const cid = countryId ?? "__none__";
  const geoFilter: Prisma.AssetWhereInput = isAdmin ? {} : {
    location: {
      OR: [
        { id: cid },
        { parentId: cid },
        { parent: { parentId: cid } },
      ],
    },
  };

  const [
    total,
    byStatus,
    byType,
    byCondition,
    byLocation,
    recentActivity,
    warrantyExpiring,
    dashboardViews,
  ] = await Promise.all([
    prisma.asset.count({ where: geoFilter }),

    prisma.asset.groupBy({
      by: ["status"],
      where: geoFilter,
      _count: { id: true },
    }),

    // Include typeId so drill-down can link to ?typeId=xxx
    prisma.asset.groupBy({
      by: ["typeId"],
      where: geoFilter,
      _count: { id: true },
    }).then(async (rows) => {
      const types = await prisma.assetType.findMany({ select: { id: true, name: true } });
      const map = new Map(types.map((t) => [t.id, t]));
      return rows.map((r) => ({
        id: r.typeId,
        name: map.get(r.typeId)?.name ?? r.typeId,
        count: r._count.id,
      }));
    }),

    prisma.asset.groupBy({
      by: ["condition"],
      where: geoFilter,
      _count: { id: true },
    }),

    // Include countryId for drill-down
    prisma.location.findMany({
      where: { type: "COUNTRY", ...(isAdmin ? {} : { id: countryId ?? "__none__" }) },
      select: {
        id: true,
        name: true,
        _count: { select: { assets: true } },
        children: {
          select: {
            _count: { select: { assets: true } },
          },
        },
      },
    }).then((countries) =>
      countries.map((c) => ({
        id: c.id,
        name: c.name,
        count: c._count.assets + c.children.reduce((s, o) => s + o._count.assets, 0),
      }))
    ),

    prisma.auditLog.findMany({
      where: isAdmin ? {} : { asset: { ...geoFilter } },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        action: true,
        entityType: true,
        createdAt: true,
        notes: true,
        performedBy: { select: { name: true } },
        asset: { select: { serialNumber: true } },
      },
    }),

    prisma.asset.count({
      where: {
        ...geoFilter,
        warrantyExpiry: {
          gte: new Date(),
          lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
      },
    }),

    // Fetch user's saved dashboards + all default ones
    prisma.dashboardView.findMany({
      where: {
        OR: [
          { isDefault: true },
          { createdById: session!.user.id },
        ],
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const statusData = byStatus.map((r) => ({
    status: r.status,
    name: STATUS_LABELS[r.status as AssetStatus] ?? r.status,
    value: r._count.id,
  }));

  const conditionLabels: Record<string, string> = {
    NEW: "New", GOOD: "Good", FAIR: "Fair", DAMAGED: "Damaged", FOR_PARTS: "For Parts",
  };
  const conditionData = byCondition.map((r) => ({
    condition: r.condition,
    name: conditionLabels[r.condition] ?? r.condition,
    count: r._count.id,
  }));

  const deployed = byStatus.find((s) => s.status === "DEPLOYED")?._count.id ?? 0;
  const inMaintenance = byStatus.find((s) => s.status === "IN_MAINTENANCE")?._count.id ?? 0;
  const legalHold = byStatus.find((s) => s.status === "LEGAL_HOLD")?._count.id ?? 0;

  return (
    <ReportsDashboard
      userRole={session!.user.role}
      userId={session!.user.id}
      chartData={{
        total,
        deployed,
        inMaintenance,
        legalHold,
        warrantyExpiring,
        statusData,
        typeData: byType,
        conditionData,
        locationData: byLocation,
        recentActivity: recentActivity.map((r) => ({
          id: r.id,
          action: r.action,
          entityType: r.entityType,
          notes: r.notes,
          createdAt: r.createdAt.toISOString(),
          performedBy: r.performedBy,
          serialNumber: r.asset?.serialNumber ?? null,
        })),
      }}
      savedDashboards={dashboardViews.map((d) => ({
        id: d.id,
        name: d.name,
        widgets: d.widgets as string[],
        isDefault: d.isDefault,
        createdById: d.createdById,
      }))}
    />
  );
}
