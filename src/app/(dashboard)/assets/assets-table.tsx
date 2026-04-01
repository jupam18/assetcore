"use client";

import { AssetStatus } from "@prisma/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/workflow";

type Asset = {
  id: string;
  serialNumber: string;
  assetTag: string | null;
  deviceName: string | null;
  status: AssetStatus;
  condition: string;
  manufacturer: string;
  model: string;
  type: { name: string };
  location: { name: string; parent: { name: string } | null } | null;
  assignments: { assignedTo: { name: string } }[];
};

const CONDITION_LABELS: Record<string, string> = {
  NEW: "New",
  GOOD: "Good",
  FAIR: "Fair",
  DAMAGED: "Damaged",
  FOR_PARTS: "For Parts",
};

export function AssetsTable({
  assets,
  total,
  page,
  limit,
  query,
  statusFilter,
  assetTypes: _assetTypes,
}: {
  assets: Asset[];
  total: number;
  page: number;
  limit: number;
  query: string;
  statusFilter: string;
  assetTypes: { id: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

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

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input
          type="search"
          placeholder="Search serial, tag, device name…"
          defaultValue={query}
          onChange={(e) => updateParam("q", e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-72"
        />
        <select
          value={statusFilter}
          onChange={(e) => updateParam("status", e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Serial Number</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Asset Tag</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Device / Model</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Assigned To</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Location</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Condition</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {assets.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                  No assets found.
                </td>
              </tr>
            )}
            {assets.map((asset) => (
              <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/assets/${asset.id}`}
                    className="font-mono text-blue-600 hover:underline font-medium"
                  >
                    {asset.serialNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                  {asset.assetTag ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">
                    {asset.deviceName ?? `${asset.manufacturer} ${asset.model}`}
                  </div>
                  {asset.deviceName && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {asset.manufacturer} {asset.model}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">{asset.type.name}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[asset.status]}`}
                  >
                    {STATUS_LABELS[asset.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {asset.assignments[0]?.assignedTo.name ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {asset.location
                    ? asset.location.parent
                      ? `${asset.location.parent.name} / ${asset.location.name}`
                      : asset.location.name
                    : "—"}
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {CONDITION_LABELS[asset.condition] ?? asset.condition}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total.toLocaleString()}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => updateParam("page", String(page - 1))}
              className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              disabled={page >= pages}
              onClick={() => updateParam("page", String(page + 1))}
              className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
