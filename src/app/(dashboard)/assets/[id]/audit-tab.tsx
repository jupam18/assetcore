"use client";

import { useEffect, useState } from "react";

type AuditEntry = {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
  ipAddress: string | null;
  notes: string | null;
  fieldChanges: Record<string, { old: unknown; new: unknown }> | null;
  performedBy: { name: string; email: string } | null;
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700",
  UPDATE: "bg-blue-100 text-blue-700",
  STATUS_CHANGE: "bg-purple-100 text-purple-700",
  ASSIGNMENT: "bg-yellow-100 text-yellow-700",
  TRANSFER: "bg-orange-100 text-orange-700",
  DELETE: "bg-red-100 text-red-700",
};

export function AuditTab({ assetId }: { assetId: string }) {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/assets/${assetId}/audit`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setLogs(d.data); })
      .finally(() => setLoading(false));
  }, [assetId]);

  if (loading) return <p className="text-sm text-gray-400 p-4">Loading audit log…</p>;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Timestamp</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Changes</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">By</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {logs.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                No audit entries yet.
              </td>
            </tr>
          )}
          {logs.map((log) => (
            <tr key={log.id}>
              <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                {new Date(log.createdAt).toISOString().slice(0, 16).replace("T", " ")}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-600"}`}>
                  {log.action}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-gray-600 max-w-xs">
                {log.fieldChanges
                  ? Object.entries(log.fieldChanges).map(([field, change]) => (
                      <div key={field}>
                        <span className="font-medium">{field}:</span>{" "}
                        <span className="text-red-500">{String(change.old)}</span>
                        {" → "}
                        <span className="text-green-600">{String(change.new)}</span>
                      </div>
                    ))
                  : "—"}
              </td>
              <td className="px-4 py-3 text-xs text-gray-600">
                {log.performedBy
                  ? log.performedBy.name
                  : "System"}
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">{log.notes ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
