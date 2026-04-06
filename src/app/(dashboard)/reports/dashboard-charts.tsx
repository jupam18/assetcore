"use client";

import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { WidgetKey } from "./dashboard-bar";

const STATUS_COLORS: Record<string, string> = {
  "In Stock":       "#6b7280",
  "Deployed":       "#004346",
  "In Maintenance": "#f59e0b",
  "Pending Return": "#8b5cf6",
  "Legal Hold":     "#dc2626",
  "Retired":        "#374151",
  "Disposed":       "#111827",
};

const CONDITION_COLORS: Record<string, string> = {
  "New":      "#79D9C3",
  "Good":     "#004346",
  "Fair":     "#f59e0b",
  "Damaged":  "#ef4444",
  "For Parts":"#6b7280",
};

const TYPE_COLORS = ["#004346", "#79D9C3", "#2aab92", "#8b5cf6", "#f59e0b"];

const ACTION_COLORS: Record<string, string> = {
  CREATE:              "bg-emerald-50 text-emerald-700 border border-emerald-200/60",
  UPDATE:              "bg-blue-50 text-blue-700 border border-blue-200/60",
  STATUS_CHANGE:       "bg-purple-50 text-purple-700 border border-purple-200/60",
  ASSIGNMENT:          "bg-amber-50 text-amber-700 border border-amber-200/60",
  TRANSFER:            "bg-orange-50 text-orange-700 border border-orange-200/60",
  DELETE:              "bg-red-50 text-red-700 border border-red-200/60",
  WORKFLOW_TRANSITION: "bg-indigo-50 text-indigo-700 border border-indigo-200/60",
};

type Props = {
  widgets: WidgetKey[];
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

export function DashboardCharts({
  widgets,
  total, deployed, inMaintenance, legalHold, warrantyExpiring,
  statusData, typeData, conditionData, locationData, recentActivity,
}: Props) {
  const router = useRouter();

  function goAssets(params: Record<string, string>) {
    const qs = new URLSearchParams(params).toString();
    router.push(`/assets?${qs}`);
  }

  return (
    <div className="space-y-6">
      {/* KPI row */}
      {widgets.includes("kpi_row") && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard label="Total Assets" value={total} icon="cube" variant="brand" onClick={() => goAssets({})} />
          <KpiCard label="Deployed" value={deployed} icon="rocket" variant="teal" onClick={() => goAssets({ status: "DEPLOYED" })} />
          <KpiCard label="In Maintenance" value={inMaintenance} icon="wrench" variant="amber" onClick={() => goAssets({ status: "IN_MAINTENANCE" })} />
          <KpiCard label="Warranty (90d)" value={warrantyExpiring} icon="shield" variant="rose" onClick={() => goAssets({})} />
        </div>
      )}

      {/* Legal hold banner */}
      {widgets.includes("legal_hold_alert") && legalHold > 0 && (
        <button
          onClick={() => goAssets({ status: "LEGAL_HOLD" })}
          className="w-full text-left bg-red-50 border border-red-200 rounded-xl px-5 py-3.5 text-sm text-red-800 hover:bg-red-100 transition-all flex items-center justify-between group"
        >
          <span><strong>{legalHold} asset{legalHold !== 1 ? "s" : ""}</strong> currently on Legal Hold</span>
          <ArrowUpRight className="w-4 h-4 text-red-400 group-hover:text-red-600 transition-colors" />
        </button>
      )}

      {/* Row 1: Status + Type */}
      {(widgets.includes("status_pie") || widgets.includes("type_bar")) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {widgets.includes("status_pie") && (
            <ChartCard title="Assets by Status" hint="Click to filter">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%" cy="50%"
                    innerRadius={75} outerRadius={115}
                    paddingAngle={2}
                    dataKey="value"
                    cursor="pointer"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onClick={(entry: any) => goAssets({ status: entry.status })}
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#6b7280"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [v, "Assets"]} contentStyle={{ borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "13px" }} />
                  <Legend formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {widgets.includes("type_bar") && (
            <ChartCard title="Assets by Type" hint="Click to filter">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={typeData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "13px" }} />
                  <Bar dataKey="count" name="Assets" radius={[6, 6, 0, 0]} cursor="pointer"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onClick={(entry: any) => goAssets({ typeId: entry.id })}>
                    {typeData.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>
      )}

      {/* Row 2: Condition + Location */}
      {(widgets.includes("condition_bar") || widgets.includes("location_bar")) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {widgets.includes("condition_bar") && (
            <ChartCard title="Assets by Condition" hint="Click to filter">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={conditionData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={70} />
                  <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "13px" }} />
                  <Bar dataKey="count" name="Assets" radius={[0, 6, 6, 0]} cursor="pointer"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onClick={(entry: any) => goAssets({ condition: entry.condition })}>
                    {conditionData.map((entry) => <Cell key={entry.name} fill={CONDITION_COLORS[entry.name] ?? "#6b7280"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {widgets.includes("location_bar") && (
            <ChartCard title="Assets by Country" hint="Click to filter">
              {locationData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">No location data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={locationData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "13px" }} />
                    <Bar dataKey="count" name="Assets" fill="#004346" radius={[6, 6, 0, 0]} cursor="pointer"
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      onClick={(entry: any) => goAssets({ q: entry.name })} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          )}
        </div>
      )}

      {/* Recent Activity */}
      {widgets.includes("recent_activity") && (
        <ChartCard title="Recent Activity">
          <div className="divide-y divide-border/50">
            {recentActivity.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">No activity yet</p>
            )}
            {recentActivity.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold shrink-0 mt-0.5 ${ACTION_COLORS[entry.action] ?? "bg-muted text-muted-foreground"}`}>
                  {entry.action.replace(/_/g, " ")}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">
                    {entry.serialNumber && (
                      <span className="font-mono font-semibold text-brand-800 mr-1.5">{entry.serialNumber}</span>
                    )}
                    {entry.notes ?? `${entry.entityType} ${entry.action.toLowerCase()}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {entry.performedBy?.name ?? "System"} &middot; {new Date(entry.createdAt).toISOString().slice(0, 16).replace("T", " ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      )}
    </div>
  );
}

function ChartCard({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="flex items-baseline gap-2 mb-5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {hint && <span className="text-[11px] text-muted-foreground/60">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function KpiCard({ label, value, variant, onClick }: {
  label: string; value: number; icon: string; variant: string; onClick?: () => void;
}) {
  const variants: Record<string, string> = {
    brand:  "bg-brand-50 border-brand-200/60",
    teal:   "bg-brand-800/5 border-brand-800/10",
    amber:  "bg-amber-50 border-amber-200/60",
    rose:   "bg-red-50 border-red-200/60",
  };
  const textVariants: Record<string, string> = {
    brand:  "text-brand-800",
    teal:   "text-brand-800",
    amber:  "text-amber-700",
    rose:   "text-red-700",
  };
  return (
    <button
      onClick={onClick}
      className={`border rounded-xl px-5 py-4 text-left w-full transition-all hover:shadow-md hover:-translate-y-0.5 group ${variants[variant]}`}
    >
      <div className="flex items-start justify-between">
        <p className={`text-3xl font-bold tracking-tight ${textVariants[variant]}`}>{value.toLocaleString()}</p>
        <ArrowUpRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
      </div>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </button>
  );
}
