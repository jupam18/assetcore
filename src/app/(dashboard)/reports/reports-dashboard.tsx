"use client";

import { useState } from "react";
import { DashboardBar, DEFAULT_WIDGETS, SavedDashboard, WidgetKey } from "./dashboard-bar";
import { DashboardCharts } from "./dashboard-charts";

type ChartData = {
  total: number;
  deployed: number;
  inMaintenance: number;
  legalHold: number;
  warrantyExpiring: number;
  statusData: { status: string; name: string; value: number }[];
  typeData: { id: string; name: string; count: number }[];
  conditionData: { condition: string; name: string; count: number }[];
  locationData: { id: string; name: string; count: number }[];
  recentActivity: {
    id: string;
    action: string;
    entityType: string;
    notes: string | null;
    createdAt: string;
    performedBy: { name: string } | null;
    serialNumber: string | null;
  }[];
};

type Props = {
  userRole: string;
  userId: string;
  chartData: ChartData;
  savedDashboards: SavedDashboard[];
};

export function ReportsDashboard({ userRole, userId, chartData, savedDashboards }: Props) {
  const [widgets, setWidgets] = useState<WidgetKey[]>(DEFAULT_WIDGETS);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Reports & Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Asset inventory overview &mdash; click any chart segment to drill down
        </p>
      </div>

      <DashboardBar
        widgets={widgets}
        onWidgetsChange={setWidgets}
        userRole={userRole}
        userId={userId}
        savedDashboards={savedDashboards}
      />

      <DashboardCharts widgets={widgets} {...chartData} />
    </div>
  );
}
