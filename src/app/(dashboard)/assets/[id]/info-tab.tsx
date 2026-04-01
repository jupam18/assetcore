"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { STATUS_COLORS, STATUS_LABELS, getAllowedTransitions, TRANSITION_LABELS } from "@/lib/workflow";
import { AssetStatus, AssetType, Location, UserRole } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type LookupOption = { id: string; value: string };
type LocationWithParent = Location & { parent: Location | null };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function InfoTab({ asset, assetTypes, locations, users, makeValues, ramValues, storageValues, processorValues, userRole }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  asset: any;
  assetTypes: AssetType[];
  locations: LocationWithParent[];
  users: { id: string; name: string; email: string }[];
  makeValues: LookupOption[];
  ramValues: LookupOption[];
  storageValues: LookupOption[];
  processorValues: LookupOption[];
  userRole: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [modelValues, setModelValues] = useState<LookupOption[]>([]);

  // Find the make value id matching current manufacturer
  const [manufacturerId, setManufacturerId] = useState(() => {
    return makeValues.find((m) => m.value === asset.manufacturer)?.id ?? "";
  });

  const [form, setForm] = useState({
    assetTag: asset.assetTag ?? "",
    deviceName: asset.deviceName ?? "",
    typeId: asset.typeId,
    manufacturer: asset.manufacturer,
    model: asset.model,
    condition: asset.condition,
    locationId: asset.locationId ?? "",
    os: asset.os ?? "",
    processor: asset.processor ?? "",
    ram: asset.ram ?? "",
    storage: asset.storage ?? "",
    purchaseDate: asset.purchaseDate ? asset.purchaseDate.slice(0, 10) : "",
    purchasePrice: asset.purchasePrice?.toString() ?? "",
    warrantyExpiry: asset.warrantyExpiry ? asset.warrantyExpiry.slice(0, 10) : "",
  });

  useEffect(() => {
    if (!manufacturerId) { setModelValues([]); return; }
    fetch(`/api/lookups/model/values?parentValueId=${manufacturerId}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setModelValues(d.data); });
  }, [manufacturerId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/assets/${asset.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : null,
        purchaseDate: form.purchaseDate || null,
        warrantyExpiry: form.warrantyExpiry || null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) { toast.success("Asset saved."); router.refresh(); }
    else toast.error(data.error ?? "Save failed.");
  }

  const allowedTransitions = getAllowedTransitions(asset.status, userRole as UserRole);

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Status row — read-only */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[asset.status as AssetStatus]}`}>
                {STATUS_LABELS[asset.status as AssetStatus]}
              </span>
            </div>
            {asset.assignments?.[0] && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Assigned To</p>
                <p className="text-sm font-medium text-gray-900">{asset.assignments[0].assignedTo.name}</p>
              </div>
            )}
            {asset.deployedDate && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Deployed Date</p>
                <p className="text-sm text-gray-700">{new Date(asset.deployedDate).toLocaleDateString()}</p>
              </div>
            )}
            {asset.returnDate && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Return Date</p>
                <p className="text-sm text-gray-700">{new Date(asset.returnDate).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          {allowedTransitions.length > 0 && (
            <StatusTransitionDialog
              assetId={asset.id}
              currentStatus={asset.status}
              allowedTransitions={allowedTransitions}
              users={users}
              userRole={userRole}
            />
          )}
        </div>
      </div>

      {/* Identification */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Identification</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Serial Number</Label>
            <Input value={asset.serialNumber} disabled className="font-mono bg-gray-50" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="assetTag">Asset Tag</Label>
            <Input id="assetTag" value={form.assetTag} onChange={(e) => setForm({ ...form, assetTag: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="deviceName">Device Name</Label>
            <Input id="deviceName" value={form.deviceName} onChange={(e) => setForm({ ...form, deviceName: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="typeId">Asset Type</Label>
            <select id="typeId" value={form.typeId} onChange={(e) => setForm({ ...form, typeId: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {assetTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Hardware */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Hardware</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="manufacturer">Manufacturer</Label>
            <select id="manufacturer" value={manufacturerId} onChange={(e) => {
              const opt = makeValues.find((m) => m.id === e.target.value);
              setManufacturerId(e.target.value);
              setForm({ ...form, manufacturer: opt?.value ?? "", model: "" });
            }} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">Select…</option>
              {makeValues.map((m) => <option key={m.id} value={m.id}>{m.value}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="model">Model</Label>
            <select id="model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} disabled={!manufacturerId} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-50">
              <option value="">{manufacturerId ? "Select model…" : "Select manufacturer first"}</option>
              {modelValues.map((m) => <option key={m.id} value={m.value}>{m.value}</option>)}
            </select>
          </div>
          {(["processor", "ram", "storage"] as const).map((key) => {
            const opts = key === "processor" ? processorValues : key === "ram" ? ramValues : storageValues;
            return (
              <div key={key} className="space-y-1">
                <Label htmlFor={key} className="capitalize">{key.toUpperCase()}</Label>
                <select id={key} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="">—</option>
                  {opts.map((o) => <option key={o.id} value={o.value}>{o.value}</option>)}
                </select>
              </div>
            );
          })}
          <div className="space-y-1">
            <Label htmlFor="condition">Condition</Label>
            <select id="condition" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {["NEW", "GOOD", "FAIR", "DAMAGED", "FOR_PARTS"].map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="os">OS / Version</Label>
            <Input id="os" value={form.os} onChange={(e) => setForm({ ...form, os: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Location & Financial */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Location & Financial</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="locationId">Location</Label>
            <select id="locationId" value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">—</option>
              {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.parent ? `${loc.parent.name} / ${loc.name}` : loc.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="purchaseDate">Purchase Date</Label>
            <Input id="purchaseDate" type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="purchasePrice">Purchase Price (USD)</Label>
            <Input id="purchasePrice" type="number" step="0.01" min="0" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="warrantyExpiry">Warranty Expiry</Label>
            <Input id="warrantyExpiry" type="date" value={form.warrantyExpiry} onChange={(e) => setForm({ ...form, warrantyExpiry: e.target.value })} />
          </div>
        </div>
      </div>

      <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
    </form>
  );
}

function StatusTransitionDialog({
  assetId,
  currentStatus,
  allowedTransitions,
  users,
  userRole: _userRole,
}: {
  assetId: string;
  currentStatus: AssetStatus;
  allowedTransitions: AssetStatus[];
  users: { id: string; name: string; email: string }[];
  userRole: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [toStatus, setToStatus] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleTransition(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(`/api/assets/${assetId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toStatus, assignedToId: assignedToId || undefined, notes: notes || undefined }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      toast.success("Status updated.");
      setOpen(false);
      router.refresh();
    } else {
      toast.error(data.error ?? "Transition failed.");
    }
  }

  const isRestore = currentStatus === "LEGAL_HOLD";
  const needsAssignee = toStatus === "DEPLOYED";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm">Change Status</Button>} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Change Status</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleTransition} className="space-y-4 mt-2">
          {isRestore ? (
            <p className="text-sm text-gray-600">This will release the Legal Hold and restore the previous status.</p>
          ) : (
            <div className="space-y-1">
              <Label htmlFor="toStatus">Transition To</Label>
              <select
                id="toStatus"
                required
                value={toStatus}
                onChange={(e) => setToStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Select…</option>
                {allowedTransitions.map((s) => (
                  <option key={s as string} value={s as string}>
                    {TRANSITION_LABELS[`${currentStatus}→${s}`] ?? STATUS_LABELS[s as AssetStatus]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {needsAssignee && (
            <div className="space-y-1">
              <Label htmlFor="assignee">Assign To *</Label>
              <select
                id="assignee"
                required
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Select user…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="transNotes">Notes (optional)</Label>
            <textarea
              id="transNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading || (!isRestore && !toStatus)}>
              {loading ? "Applying…" : "Apply"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
