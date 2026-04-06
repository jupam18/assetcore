"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type LookupOption = { id: string; value: string };
type Shipment = {
  id: string;
  trackingNumber: string | null;
  carrier: string | null;
  shippingStatus: string;
  originLocation: string | null;
  destLocation: string | null;
  shipmentDate: string | null;
  expectedDelivery: string | null;
  receivedDate: string | null;
  poNumber: string | null;
  invoiceNumber: string | null;
  customsRef: string | null;
  insuranceClaim: string | null;
  transferNotes: string | null;
  createdAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_PICKUP: "Pending Pickup",
  IN_TRANSIT: "In Transit",
  AT_CUSTOMS: "At Customs",
  DELIVERED: "Delivered",
  LOST: "Lost",
};

export function LogisticsTab({
  asset,
  carrierValues,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  asset: any;
  carrierValues: LookupOption[];
}) {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    trackingNumber: "",
    carrier: "",
    originLocation: asset.location?.name ?? "",
    destLocation: "",
    shipmentDate: "",
    expectedDelivery: "",
    poNumber: "",
    invoiceNumber: "",
    customsRef: "",
    transferNotes: "",
  });

  useEffect(() => {
    fetch(`/api/assets/${asset.id}/shipments`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setShipments(d.data); })
      .finally(() => setLoading(false));
  }, [asset.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/assets/${asset.id}/shipments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        shipmentDate: form.shipmentDate || null,
        expectedDelivery: form.expectedDelivery || null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) {
      setShipments((prev) => [data.data, ...prev]);
      setShowForm(false);
      toast.success("Shipment recorded.");
    } else {
      toast.error(data.error ?? "Failed to save shipment.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Current location */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-semibold text-gray-900 mb-3">Current Location</h2>
        <p className="text-sm text-gray-700">
          {asset.location
            ? asset.location.parent
              ? `${asset.location.parent.name} / ${asset.location.name}`
              : asset.location.name
            : "Not assigned"}
        </p>
      </div>

      {/* New shipment form */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Shipments</h2>
          <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "Log Shipment"}
          </Button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="space-y-1">
              <Label htmlFor="trackingNumber">Tracking Number</Label>
              <Input id="trackingNumber" value={form.trackingNumber} onChange={(e) => setForm({ ...form, trackingNumber: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="carrier">Carrier</Label>
              <select id="carrier" value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="">—</option>
                {carrierValues.map((c) => <option key={c.id} value={c.value}>{c.value}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="originLocation">Origin</Label>
              <Input id="originLocation" value={form.originLocation} onChange={(e) => setForm({ ...form, originLocation: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="destLocation">Destination</Label>
              <Input id="destLocation" value={form.destLocation} onChange={(e) => setForm({ ...form, destLocation: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="shipmentDate">Shipment Date</Label>
              <Input id="shipmentDate" type="date" value={form.shipmentDate} onChange={(e) => setForm({ ...form, shipmentDate: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="expectedDelivery">Expected Delivery</Label>
              <Input id="expectedDelivery" type="date" value={form.expectedDelivery} onChange={(e) => setForm({ ...form, expectedDelivery: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="poNumber">PO Number</Label>
              <Input id="poNumber" value={form.poNumber} onChange={(e) => setForm({ ...form, poNumber: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="invoiceNumber">Invoice Number</Label>
              <Input id="invoiceNumber" value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label htmlFor="transferNotes">Transfer Notes</Label>
              <textarea id="transferNotes" rows={2} value={form.transferNotes} onChange={(e) => setForm({ ...form, transferNotes: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none" />
            </div>
            <div className="col-span-2">
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Shipment"}</Button>
            </div>
          </form>
        )}

        {/* History */}
        {loading && <p className="text-sm text-gray-400">Loading…</p>}
        {!loading && shipments.length === 0 && (
          <p className="text-sm text-gray-400">No shipments recorded.</p>
        )}
        <div className="space-y-3">
          {shipments.map((s) => (
            <div key={s.id} className="border border-gray-100 rounded-lg p-4 text-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">
                  {s.originLocation || "?"} → {s.destLocation || "?"}
                </span>
                <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                  {STATUS_LABELS[s.shippingStatus] ?? s.shippingStatus}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                {s.trackingNumber && <span>📦 {s.trackingNumber}</span>}
                {s.carrier && <span>🚚 {s.carrier}</span>}
                {s.shipmentDate && <span>📅 {new Date(s.shipmentDate).toISOString().slice(0, 10)}</span>}
              </div>
              {s.transferNotes && <p className="mt-2 text-xs text-gray-500">{s.transferNotes}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
