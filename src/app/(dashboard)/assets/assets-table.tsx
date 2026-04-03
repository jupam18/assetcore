"use client";

import { AssetRow, COLUMN_MAP, DEFAULT_COLUMNS } from "@/lib/column-definitions";
import { STATUS_LABELS } from "@/lib/workflow";
import { Download, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { ViewBar } from "./view-bar";

const CONDITION_LABELS: Record<string, string> = {
  NEW: "New", GOOD: "Good", FAIR: "Fair", DAMAGED: "Damaged", FOR_PARTS: "For Parts",
};

export function AssetsTable({
  assets, total, page, limit, query, statusFilter, conditionFilter, typeIdFilter, assetTypes, userRole, userId,
}: {
  assets: AssetRow[];
  total: number;
  page: number;
  limit: number;
  query: string;
  statusFilter: string;
  conditionFilter: string;
  typeIdFilter: string;
  assetTypes: { id: string; name: string }[];
  userRole: string;
  userId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [columns, setColumns] = useState<string[]>(DEFAULT_COLUMNS);

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.set("page", "1");
      startTransition(() => router.push(`/assets?${params.toString()}`));
    },
    [router, searchParams]
  );

  const pages = Math.ceil(total / limit);
  const activeCols = columns.map((k) => COLUMN_MAP[k]).filter(Boolean);

  const exportBase = `/api/assets/export?${query ? `q=${encodeURIComponent(query)}&` : ""}${statusFilter ? `status=${statusFilter}&` : ""}${conditionFilter ? `condition=${conditionFilter}&` : ""}${typeIdFilter ? `typeId=${typeIdFilter}&` : ""}`;

  const selectClass = "rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300/20 transition-all appearance-none cursor-pointer";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2.5 flex-wrap items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input
            type="search"
            placeholder="Search assets..."
            defaultValue={query}
            onChange={(e) => updateParam("q", e.target.value)}
            className="rounded-lg border border-border bg-card pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300/20 w-64 transition-all"
          />
        </div>
        <select value={statusFilter} onChange={(e) => updateParam("status", e.target.value)} className={selectClass}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={conditionFilter} onChange={(e) => updateParam("condition", e.target.value)} className={selectClass}>
          <option value="">All conditions</option>
          {Object.entries(CONDITION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={typeIdFilter} onChange={(e) => updateParam("typeId", e.target.value)} className={selectClass}>
          <option value="">All types</option>
          {assetTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{total.toLocaleString()} results</span>
          <a href={`${exportBase}format=xlsx`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm text-foreground hover:bg-secondary transition-colors">
            <Download className="w-3.5 h-3.5" /> XLSX
          </a>
          <a href={`${exportBase}format=csv`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm text-foreground hover:bg-secondary transition-colors">
            <Download className="w-3.5 h-3.5" /> CSV
          </a>
        </div>
      </div>

      {/* View bar */}
      <ViewBar columns={columns} onColumnsChange={setColumns} userRole={userRole} userId={userId} />

      {/* Table */}
      <div className={`rounded-xl border border-border bg-card overflow-x-auto shadow-sm transition-opacity duration-200 ${isPending ? "opacity-60" : ""}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {activeCols.map((col) => (
                <th key={col.key} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap bg-muted/30">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 && (
              <tr>
                <td colSpan={activeCols.length || 1} className="px-4 py-16 text-center text-muted-foreground">
                  <div className="space-y-1">
                    <p className="text-base font-medium">No assets found</p>
                    <p className="text-sm">Try adjusting your search or filters</p>
                  </div>
                </td>
              </tr>
            )}
            {assets.map((asset, i) => (
              <tr key={asset.id} className={`transition-colors hover:bg-brand-50/50 ${i !== assets.length - 1 ? "border-b border-border/50" : ""}`}>
                {activeCols.map((col) => (
                  <td key={col.key} className={`px-4 py-3 ${col.className ?? ""}`}>
                    {col.render(asset)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Showing {(page - 1) * limit + 1}&ndash;{Math.min(page * limit, total)} of {total.toLocaleString()}
          </span>
          <div className="flex gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => updateParam("page", String(page - 1))}
              className="px-3.5 py-1.5 rounded-lg border border-border bg-card text-foreground text-sm font-medium disabled:opacity-30 hover:bg-secondary transition-colors"
            >
              Previous
            </button>
            <button
              disabled={page >= pages}
              onClick={() => updateParam("page", String(page + 1))}
              className="px-3.5 py-1.5 rounded-lg border border-border bg-card text-foreground text-sm font-medium disabled:opacity-30 hover:bg-secondary transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
