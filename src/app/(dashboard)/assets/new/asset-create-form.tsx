"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AssetType, Location } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type LookupOption = { id: string; value: string };
type LocationWithParent = Location & { parent: Location | null };

export function AssetCreateForm({
  assetTypes,
  locations,
  makeValues,
  ramValues,
  storageValues,
  processorValues,
}: {
  assetTypes: AssetType[];
  locations: LocationWithParent[];
  makeValues: LookupOption[];
  ramValues: LookupOption[];
  storageValues: LookupOption[];
  processorValues: LookupOption[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modelValues, setModelValues] = useState<LookupOption[]>([]);

  const [form, setForm] = useState({
    serialNumber: "",
    assetTag: "",
    deviceName: "",
    typeId: assetTypes[0]?.id ?? "",
    manufacturer: "",
    manufacturerId: "",
    model: "",
    condition: "NEW",
    locationId: "",
    os: "",
    processor: "",
    ram: "",
    storage: "",
    purchaseDate: "",
    purchasePrice: "",
    warrantyExpiry: "",
  });

  useEffect(() => {
    if (!form.manufacturerId) {
      setModelValues([]);
      setForm((f) => ({ ...f, model: "" }));
      return;
    }
    fetch(`/api/lookups/model/values?parentValueId=${form.manufacturerId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setModelValues(d.data);
      });
    setForm((f) => ({ ...f, model: "" }));
  }, [form.manufacturerId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload = {
      serialNumber: form.serialNumber.toUpperCase().trim(),
      assetTag: form.assetTag || null,
      deviceName: form.deviceName || null,
      typeId: form.typeId,
      manufacturer: form.manufacturer,
      model: form.model,
      condition: form.condition,
      locationId: form.locationId,
      os: form.os || null,
      processor: form.processor || null,
      ram: form.ram || null,
      storage: form.storage || null,
      purchaseDate: form.purchaseDate || null,
      purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : null,
      warrantyExpiry: form.warrantyExpiry || null,
    };

    const res = await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setLoading(false);

    if (data.success) {
      toast.success("Asset created.");
      router.push(`/assets/${data.data.id}`);
    } else {
      setError(data.error ?? "Something went wrong.");
    }
  }

  const field = (
    id: keyof typeof form,
    label: string,
    props?: React.InputHTMLAttributes<HTMLInputElement>
  ) => (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={form[id]}
        onChange={(e) => setForm({ ...form, [id]: e.target.value })}
        {...props}
      />
    </div>
  );

  const select = (
    id: keyof typeof form,
    label: string,
    options: { value: string; label: string }[],
    required = false
  ) => (
    <div className="space-y-1">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <select
        id={id}
        required={required}
        value={form[id]}
        onChange={(e) => setForm({ ...form, [id]: e.target.value })}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Identification */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Identification</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="serialNumber">
              Serial Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="serialNumber"
              required
              value={form.serialNumber}
              onChange={(e) =>
                setForm({ ...form, serialNumber: e.target.value.toUpperCase() })
              }
              className="font-mono"
              placeholder="SN-NB-UY-001"
            />
          </div>
          {field("assetTag", "Asset Tag", { placeholder: "NB-UY-001 (optional)" })}
          {field("deviceName", "Device Name", { placeholder: "Hostname or friendly name" })}
          {select(
            "typeId",
            "Asset Type",
            assetTypes.map((t) => ({ value: t.id, label: t.name })),
            true
          )}
        </div>
      </section>

      {/* Hardware */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Hardware</h2>
        <div className="grid grid-cols-2 gap-4">
          {/* Manufacturer */}
          <div className="space-y-1">
            <Label htmlFor="manufacturer">
              Manufacturer <span className="text-red-500">*</span>
            </Label>
            <select
              id="manufacturer"
              required
              value={form.manufacturerId}
              onChange={(e) => {
                const opt = makeValues.find((m) => m.id === e.target.value);
                setForm({
                  ...form,
                  manufacturerId: e.target.value,
                  manufacturer: opt?.value ?? "",
                });
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select…</option>
              {makeValues.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.value}
                </option>
              ))}
            </select>
          </div>

          {/* Model (cascades from manufacturer) */}
          <div className="space-y-1">
            <Label htmlFor="model">
              Model <span className="text-red-500">*</span>
            </Label>
            <select
              id="model"
              required
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              disabled={!form.manufacturerId}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
            >
              <option value="">
                {form.manufacturerId ? "Select model…" : "Select manufacturer first"}
              </option>
              {modelValues.map((m) => (
                <option key={m.id} value={m.value}>
                  {m.value}
                </option>
              ))}
            </select>
          </div>

          {select(
            "condition",
            "Condition",
            [
              { value: "NEW", label: "New" },
              { value: "GOOD", label: "Good" },
              { value: "FAIR", label: "Fair" },
              { value: "DAMAGED", label: "Damaged" },
              { value: "FOR_PARTS", label: "For Parts" },
            ],
            true
          )}

          {select(
            "processor",
            "Processor",
            processorValues.map((v) => ({ value: v.value, label: v.value }))
          )}
          {select(
            "ram",
            "RAM",
            ramValues.map((v) => ({ value: v.value, label: v.value }))
          )}
          {select(
            "storage",
            "Storage",
            storageValues.map((v) => ({ value: v.value, label: v.value }))
          )}
          {field("os", "OS / Version", { placeholder: "Windows 11 Pro 23H2" })}
        </div>
      </section>

      {/* Location */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Location</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="locationId">
              Location <span className="text-red-500">*</span>
            </Label>
            <select
              id="locationId"
              required
              value={form.locationId}
              onChange={(e) => setForm({ ...form, locationId: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select…</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.parent ? `${loc.parent.name} / ${loc.name}` : loc.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Financial */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Financial</h2>
        <div className="grid grid-cols-2 gap-4">
          {field("purchaseDate", "Purchase Date", { type: "date" })}
          {field("purchasePrice", "Purchase Price (USD)", {
            type: "number",
            min: "0",
            step: "0.01",
            placeholder: "0.00",
          })}
          {field("warrantyExpiry", "Warranty Expiry", { type: "date" })}
        </div>
      </section>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create Asset"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/assets")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
