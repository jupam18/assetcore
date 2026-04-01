"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LookupList, LookupValue } from "@prisma/client";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type ListWithCount = LookupList & { _count: { values: number } };

export function LookupManager({ lists }: { lists: ListWithCount[] }) {
  const [selectedList, setSelectedList] = useState<ListWithCount | null>(
    lists[0] ?? null
  );
  const [values, setValues] = useState<LookupValue[]>([]);
  const [loadingValues, setLoadingValues] = useState(false);

  const [newValue, setNewValue] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);

  async function loadValues(list: ListWithCount) {
    setLoadingValues(true);
    const res = await fetch(`/api/admin/lookups/${list.id}/values`);
    const data = await res.json();
    setLoadingValues(false);
    if (data.success) setValues(data.data);
    else toast.error("Failed to load values.");
  }

  useEffect(() => {
    if (selectedList) loadValues(selectedList);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedList?.id]);

  async function addValue(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedList || !newValue.trim()) return;
    setAdding(true);

    const res = await fetch(`/api/admin/lookups/${selectedList.id}/values`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: newValue.trim(), label: newLabel.trim() || undefined }),
    });
    const data = await res.json();
    setAdding(false);

    if (data.success) {
      setValues((prev) => [...prev, data.data]);
      setNewValue("");
      setNewLabel("");
      toast.success("Value added.");
    } else {
      toast.error(data.error ?? "Failed to add value.");
    }
  }

  async function toggleActive(value: LookupValue) {
    const res = await fetch(
      `/api/admin/lookups/${selectedList!.id}/values/${value.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !value.isActive }),
      }
    );
    const data = await res.json();
    if (data.success) {
      setValues((prev) =>
        prev.map((v) => (v.id === value.id ? { ...v, isActive: !v.isActive } : v))
      );
    } else {
      toast.error(data.error ?? "Failed to update value.");
    }
  }

  async function updateSortOrder(value: LookupValue, sortOrder: number) {
    const res = await fetch(
      `/api/admin/lookups/${selectedList!.id}/values/${value.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder }),
      }
    );
    const data = await res.json();
    if (data.success) {
      setValues((prev) =>
        prev
          .map((v) => (v.id === value.id ? { ...v, sortOrder } : v))
          .sort((a, b) => a.sortOrder - b.sortOrder)
      );
    } else {
      toast.error("Failed to update order.");
    }
  }

  return (
    <div className="flex gap-6 min-h-0">
      {/* Left: list selector */}
      <aside className="w-56 shrink-0">
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Lists
            </span>
          </div>
          <ul className="divide-y divide-gray-100">
            {lists.map((list) => (
              <li key={list.id}>
                <button
                  onClick={() => setSelectedList(list)}
                  className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                    selectedList?.id === list.id
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <div className="font-medium">{list.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {list._count.values} active values
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Right: values editor */}
      <div className="flex-1 space-y-4">
        {selectedList && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedList.label}
                </h2>
                <p className="text-xs text-gray-400">list name: {selectedList.name}</p>
              </div>
            </div>

            {/* Add value form */}
            <form
              onSubmit={addValue}
              className="flex items-end gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200"
            >
              <div className="space-y-1 flex-1">
                <Label htmlFor="new-value">Value *</Label>
                <Input
                  id="new-value"
                  placeholder="e.g. Dell"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1 flex-1">
                <Label htmlFor="new-label">Label (optional)</Label>
                <Input
                  id="new-label"
                  placeholder="Display name (if different)"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={adding}>
                <Plus className="w-4 h-4 mr-1" />
                {adding ? "Adding…" : "Add"}
              </Button>
            </form>

            {/* Values table */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Value</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Label</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 w-24">Order</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 w-24">Status</th>
                    <th className="w-24 px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingValues && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                        Loading…
                      </td>
                    </tr>
                  )}
                  {!loadingValues && values.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                        No values yet. Add one above.
                      </td>
                    </tr>
                  )}
                  {values.map((v) => (
                    <tr key={v.id} className={!v.isActive ? "opacity-50" : ""}>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{v.value}</td>
                      <td className="px-4 py-2.5 text-gray-500">{v.label || "—"}</td>
                      <td className="px-4 py-2.5">
                        <input
                          type="number"
                          defaultValue={v.sortOrder}
                          onBlur={(e) => {
                            const n = Number(e.target.value);
                            if (!isNaN(n) && n !== v.sortOrder) updateSortOrder(v, n);
                          }}
                          className="w-16 rounded border border-gray-200 px-2 py-1 text-xs text-center"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            v.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {v.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => toggleActive(v)}
                          className="text-xs text-gray-500 hover:text-gray-800 underline"
                        >
                          {v.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
