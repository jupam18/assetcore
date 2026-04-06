"use client";

import { useState } from "react";
import { Check, Globe, Lock, MapPin, Plus, ShieldCheck, Trash2, Users, X } from "lucide-react";

export type RolePermissions = {
  assets: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    changeStatus: boolean;
    export: boolean;
    import: boolean;
  };
  admin: {
    users: boolean;
    lookups: boolean;
    workflows: boolean;
    settings: boolean;
    audit: boolean;
    roles: boolean;
  };
  scope: "own_country" | "all";
};

type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  userCount: number;
  permissions: RolePermissions;
  createdAt: string;
};

const DEFAULT_PERMISSIONS: RolePermissions = {
  assets: { view: true, create: false, edit: false, delete: false, changeStatus: false, export: false, import: false },
  admin: { users: false, lookups: false, workflows: false, settings: false, audit: false, roles: false },
  scope: "own_country",
};

const ASSET_PERMS: { key: keyof RolePermissions["assets"]; label: string; desc: string }[] = [
  { key: "view", label: "View Assets", desc: "Read asset list and details" },
  { key: "create", label: "Create Assets", desc: "Add new assets to the system" },
  { key: "edit", label: "Edit Assets", desc: "Modify asset fields and specs" },
  { key: "delete", label: "Delete Assets", desc: "Remove assets (audit-logged)" },
  { key: "changeStatus", label: "Change Status", desc: "Trigger workflow transitions" },
  { key: "export", label: "Export Data", desc: "Download XLSX/CSV exports" },
  { key: "import", label: "Import Bulk", desc: "Upload CSV bulk imports" },
];

const ADMIN_PERMS: { key: keyof RolePermissions["admin"]; label: string; desc: string }[] = [
  { key: "users", label: "User Management", desc: "Create, edit, deactivate users" },
  { key: "lookups", label: "Lookup Lists", desc: "Manage dropdown values" },
  { key: "workflows", label: "Workflows", desc: "Build and activate workflows" },
  { key: "settings", label: "System Settings", desc: "Configure system-wide settings" },
  { key: "audit", label: "Audit Log", desc: "View global audit trail" },
  { key: "roles", label: "Role Builder", desc: "Create and edit custom roles" },
];

function PermToggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`w-9 h-5 rounded-full relative transition-all duration-200
        ${checked ? "bg-brand-500" : "bg-muted-foreground/20"}
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200
        ${checked ? "translate-x-[18px]" : "translate-x-0.5"}`} />
    </button>
  );
}

export function RoleBuilder({ initialRoles }: { initialRoles: RoleRow[] }) {
  const [roles, setRoles] = useState<RoleRow[]>(initialRoles);
  const [selected, setSelected] = useState<RoleRow | null>(initialRoles[0] ?? null);
  const [editing, setEditing] = useState<RolePermissions>(initialRoles[0]?.permissions ?? DEFAULT_PERMISSIONS);
  const [name, setName] = useState(initialRoles[0]?.name ?? "");
  const [description, setDescription] = useState(initialRoles[0]?.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  function selectRole(role: RoleRow) {
    setSelected(role);
    setEditing(role.permissions);
    setName(role.name);
    setDescription(role.description ?? "");
    setError("");
  }

  function setAssetPerm(key: keyof RolePermissions["assets"], value: boolean) {
    setEditing((prev) => ({ ...prev, assets: { ...prev.assets, [key]: value } }));
  }
  function setAdminPerm(key: keyof RolePermissions["admin"], value: boolean) {
    setEditing((prev) => ({ ...prev, admin: { ...prev.admin, [key]: value } }));
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/roles/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, permissions: editing }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(typeof json.error === "string" ? json.error : "Save failed");
      const updated = { ...selected, name, description, permissions: editing };
      setRoles((prev) => prev.map((r) => (r.id === selected.id ? updated : r)));
      setSelected(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), description: newDesc, permissions: DEFAULT_PERMISSIONS }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(typeof json.error === "string" ? json.error : "Create failed");
      const newRole: RoleRow = { ...json.data, userCount: 0, permissions: DEFAULT_PERMISSIONS };
      setRoles((prev) => [...prev, newRole]);
      selectRole(newRole);
      setShowNew(false);
      setNewName("");
      setNewDesc("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(role: RoleRow) {
    if (!confirm(`Delete role "${role.name}"?`)) return;
    setError("");
    try {
      const res = await fetch(`/api/admin/roles/${role.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(typeof json.error === "string" ? json.error : "Delete failed");
      const remaining = roles.filter((r) => r.id !== role.id);
      setRoles(remaining);
      if (selected?.id === role.id) {
        const next = remaining[0] ?? null;
        if (next) selectRole(next);
        else { setSelected(null); setEditing(DEFAULT_PERMISSIONS); }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  // Count enabled permissions
  function countPerms(perms: RolePermissions) {
    return Object.values(perms.assets).filter(Boolean).length + Object.values(perms.admin).filter(Boolean).length;
  }

  return (
    <div className="flex gap-6 items-start">
      {/* Role List */}
      <div className="w-72 shrink-0 space-y-1.5">
        {roles.map((role) => (
          <div
            key={role.id}
            onClick={() => selectRole(role)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer group transition-all
              ${selected?.id === role.id
                ? "bg-brand-50 border border-brand-300/60 shadow-sm"
                : "bg-card border border-border hover:border-brand-200 hover:shadow-sm"
              }`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0
              ${selected?.id === role.id ? "bg-brand-800 text-white" : "bg-muted text-muted-foreground"}`}>
              {role.isSystem ? <ShieldCheck className="w-4 h-4" /> : <Users className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-foreground truncate">{role.name}</span>
                {role.isSystem && <Lock className="w-3 h-3 text-muted-foreground/50 shrink-0" />}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                <span>{role.userCount} user{role.userCount !== 1 ? "s" : ""}</span>
                <span className="text-muted-foreground/30">&middot;</span>
                <span>{countPerms(role.permissions)} perms</span>
              </div>
            </div>
            {!role.isSystem && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(role); }}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground/40 hover:text-red-500 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}

        {showNew ? (
          <div className="border border-brand-300/60 rounded-xl p-4 space-y-2.5 bg-brand-50/50">
            <input autoFocus placeholder="Role name" value={newName} onChange={(e) => setNewName(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-300/20" />
            <input placeholder="Description (optional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:border-brand-500" />
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={saving || !newName.trim()}
                className="flex-1 rounded-lg bg-brand-800 text-white text-sm font-medium py-2 disabled:opacity-40 hover:bg-brand-900 transition-colors">
                Create
              </button>
              <button onClick={() => { setShowNew(false); setNewName(""); setNewDesc(""); }}
                className="px-2.5 rounded-lg border border-border hover:bg-secondary transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowNew(true)}
            className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-brand-700 hover:bg-brand-50 transition-all border border-dashed border-brand-300/60">
            <Plus className="w-4 h-4" />
            New Role
          </button>
        )}
      </div>

      {/* Permission Editor */}
      {selected ? (
        <div className="flex-1 bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-border bg-muted/20">
            {selected.isSystem ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-800 text-white flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    {selected.name}
                    <span className="text-[11px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">System</span>
                  </h2>
                  {selected.description && <p className="text-sm text-muted-foreground mt-0.5">{selected.description}</p>}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Name</label>
                    <input value={name} onChange={(e) => setName(e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-300/20" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
                    <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description"
                      className="mt-1 block w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:border-brand-500" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-5 space-y-6">
            {/* Scope */}
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Data Scope</h3>
              <div className="grid grid-cols-2 gap-3">
                {(["own_country", "all"] as const).map((scope) => (
                  <button key={scope} type="button" disabled={selected.isSystem}
                    onClick={() => setEditing((prev) => ({ ...prev, scope }))}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all
                      ${editing.scope === scope
                        ? "border-brand-500 bg-brand-50 shadow-sm"
                        : "border-border bg-card hover:border-brand-200"
                      } ${selected.isSystem ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center
                      ${editing.scope === scope ? "bg-brand-800 text-white" : "bg-muted text-muted-foreground"}`}>
                      {scope === "own_country" ? <MapPin className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{scope === "own_country" ? "Own Country" : "All Countries"}</p>
                      <p className="text-xs text-muted-foreground">{scope === "own_country" ? "Limited to assigned country" : "Global access"}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Asset Permissions */}
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Asset Permissions</h3>
              <div className="bg-muted/20 rounded-xl border border-border overflow-hidden divide-y divide-border/50">
                {ASSET_PERMS.map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <PermToggle checked={editing.assets[key]} onChange={(v) => setAssetPerm(key, v)} disabled={selected.isSystem} />
                  </div>
                ))}
              </div>
            </div>

            {/* Admin Permissions */}
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Admin Portal Access</h3>
              <div className="bg-muted/20 rounded-xl border border-border overflow-hidden divide-y divide-border/50">
                {ADMIN_PERMS.map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <PermToggle checked={editing.admin[key]} onChange={(v) => setAdminPerm(key, v)} disabled={selected.isSystem} />
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-destructive bg-red-50 rounded-lg px-3 py-2 border border-red-200">{error}</p>}

            {!selected.isSystem && (
              <div className="flex justify-end pt-2">
                <button onClick={handleSave} disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-brand-800 text-white text-sm font-medium hover:bg-brand-900 disabled:opacity-40 transition-all shadow-sm">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground h-64 bg-card border border-border rounded-xl">
          Select a role or create a new one
        </div>
      )}
    </div>
  );
}
