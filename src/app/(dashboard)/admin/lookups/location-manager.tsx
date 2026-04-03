"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronRight, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Loc = {
  id: string;
  name: string;
  type: string;
  address: string | null;
  timezone: string | null;
  isActive: boolean;
  parentId: string | null;
  parent: { id: string; name: string } | null;
};

export function LocationManager() {
  const [locations, setLocations] = useState<Loc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<Loc | null>(null);

  // Add country form
  const [addingCountry, setAddingCountry] = useState(false);
  const [newCountryName, setNewCountryName] = useState("");
  const [savingCountry, setSavingCountry] = useState(false);

  // Add office form
  const [addingOffice, setAddingOffice] = useState(false);
  const [newOfficeName, setNewOfficeName] = useState("");
  const [newOfficeAddress, setNewOfficeAddress] = useState("");
  const [savingOffice, setSavingOffice] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/locations");
    const data = await res.json();
    setLoading(false);
    if (data.success) setLocations(data.data);
    else toast.error("Failed to load locations.");
  }

  useEffect(() => { load(); }, []);

  const countries = locations.filter((l) => l.type === "COUNTRY");
  const officesFor = (countryId: string) =>
    locations.filter((l) => l.type === "OFFICE" && l.parentId === countryId);

  async function addCountry(e: React.FormEvent) {
    e.preventDefault();
    if (!newCountryName.trim()) return;
    setSavingCountry(true);
    const res = await fetch("/api/admin/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCountryName.trim(), type: "COUNTRY" }),
    });
    const data = await res.json();
    setSavingCountry(false);
    if (data.success) {
      setLocations((prev) => [...prev, data.data]);
      setNewCountryName("");
      setAddingCountry(false);
      setSelectedCountry(data.data);
      toast.success("Country added.");
    } else {
      toast.error(data.error ?? "Failed to add country.");
    }
  }

  async function addOffice(e: React.FormEvent) {
    e.preventDefault();
    if (!newOfficeName.trim() || !selectedCountry) return;
    setSavingOffice(true);
    const res = await fetch("/api/admin/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newOfficeName.trim(),
        type: "OFFICE",
        parentId: selectedCountry.id,
        address: newOfficeAddress.trim() || null,
      }),
    });
    const data = await res.json();
    setSavingOffice(false);
    if (data.success) {
      setLocations((prev) => [...prev, data.data]);
      setNewOfficeName("");
      setNewOfficeAddress("");
      setAddingOffice(false);
      toast.success("Office added.");
    } else {
      toast.error(data.error ?? "Failed to add office.");
    }
  }

  async function toggleActive(loc: Loc) {
    const res = await fetch(`/api/admin/locations/${loc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !loc.isActive }),
    });
    const data = await res.json();
    if (data.success) {
      setLocations((prev) => prev.map((l) => (l.id === loc.id ? { ...l, isActive: !l.isActive } : l)));
    } else {
      toast.error(data.error ?? "Failed to update.");
    }
  }

  if (loading) return <p className="text-sm text-gray-400 p-4">Loading locations…</p>;

  return (
    <div className="flex gap-6 min-h-0">
      {/* Left: countries */}
      <aside className="w-56 shrink-0">
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Countries</span>
            <button
              onClick={() => setAddingCountry(true)}
              className="text-blue-600 hover:text-blue-700"
              title="Add country"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {addingCountry && (
            <form onSubmit={addCountry} className="p-3 border-b border-gray-100 space-y-2">
              <Input
                autoFocus
                placeholder="Country name"
                value={newCountryName}
                onChange={(e) => setNewCountryName(e.target.value)}
                required
              />
              <div className="flex gap-1.5">
                <Button type="submit" size="sm" disabled={savingCountry} className="flex-1">
                  {savingCountry ? "…" : "Add"}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => { setAddingCountry(false); setNewCountryName(""); }}>
                  ✕
                </Button>
              </div>
            </form>
          )}

          <ul className="divide-y divide-gray-100">
            {countries.length === 0 && (
              <li className="px-3 py-4 text-xs text-gray-400 text-center">No countries yet.</li>
            )}
            {countries.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setSelectedCountry(c)}
                  className={`w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center justify-between ${
                    selectedCountry?.id === c.id
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  } ${!c.isActive ? "opacity-50" : ""}`}
                >
                  <span>{c.name}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Right: offices + actions */}
      <div className="flex-1 space-y-4">
        {!selectedCountry && (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
            Select a country to manage its offices.
          </div>
        )}

        {selectedCountry && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{selectedCountry.name}</h2>
                <p className="text-xs text-gray-400">Country · {officesFor(selectedCountry.id).length} office(s)</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(selectedCountry)}
                  className="text-xs text-gray-500 hover:text-gray-800 underline"
                >
                  {selectedCountry.isActive ? "Deactivate country" : "Activate country"}
                </button>
                <Button size="sm" variant="outline" onClick={() => setAddingOffice(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Office
                </Button>
              </div>
            </div>

            {addingOffice && (
              <form onSubmit={addOffice} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="office-name">Office Name *</Label>
                    <Input
                      id="office-name"
                      autoFocus
                      placeholder="e.g. Montevideo HQ"
                      value={newOfficeName}
                      onChange={(e) => setNewOfficeName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="office-address">Address (optional)</Label>
                    <Input
                      id="office-address"
                      placeholder="Street, City"
                      value={newOfficeAddress}
                      onChange={(e) => setNewOfficeAddress(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={savingOffice}>
                    {savingOffice ? "Adding…" : "Add Office"}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => { setAddingOffice(false); setNewOfficeName(""); setNewOfficeAddress(""); }}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Office</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Address</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 w-24">Status</th>
                    <th className="w-24 px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {officesFor(selectedCountry.id).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                        No offices yet. Add one above.
                      </td>
                    </tr>
                  )}
                  {officesFor(selectedCountry.id).map((office) => (
                    <tr key={office.id} className={!office.isActive ? "opacity-50" : ""}>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{office.name}</td>
                      <td className="px-4 py-2.5 text-gray-500">{office.address ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${office.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {office.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => toggleActive(office)} className="text-xs text-gray-500 hover:text-gray-800 underline">
                          {office.isActive ? "Deactivate" : "Activate"}
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
