"use client";

import { Check, ChevronDown, GripVertical, LayoutDashboard, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export type WidgetKey =
  | "kpi_row"
  | "legal_hold_alert"
  | "status_pie"
  | "type_bar"
  | "condition_bar"
  | "location_bar"
  | "recent_activity";

export const ALL_WIDGETS: { key: WidgetKey; label: string; desc: string }[] = [
  { key: "kpi_row", label: "KPI Cards", desc: "Total, Deployed, Maintenance, Warranty" },
  { key: "legal_hold_alert", label: "Legal Hold Alert", desc: "Banner when assets are on legal hold" },
  { key: "status_pie", label: "Assets by Status", desc: "Donut chart with drill-down" },
  { key: "type_bar", label: "Assets by Type", desc: "Bar chart with drill-down" },
  { key: "condition_bar", label: "Assets by Condition", desc: "Horizontal bar with drill-down" },
  { key: "location_bar", label: "Assets by Country", desc: "Bar chart with drill-down" },
  { key: "recent_activity", label: "Recent Activity", desc: "Last 15 audit log entries" },
];

export const DEFAULT_WIDGETS: WidgetKey[] = [
  "kpi_row", "legal_hold_alert", "status_pie", "type_bar", "condition_bar", "location_bar", "recent_activity",
];

export type SavedDashboard = {
  id: string;
  name: string;
  widgets: string[];
  isDefault: boolean;
  createdById: string | null;
};

type Props = {
  widgets: WidgetKey[];
  onWidgetsChange: (w: WidgetKey[]) => void;
  userRole: string;
  userId: string;
  savedDashboards: SavedDashboard[];
};

export function DashboardBar({ widgets, onWidgetsChange, userRole, userId, savedDashboards: initial }: Props) {
  const [dashboards, setDashboards] = useState<SavedDashboard[]>(initial);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const saveRef = useRef<HTMLDivElement>(null);
  const dragKey = useRef<WidgetKey | null>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (saveRef.current && !saveRef.current.contains(e.target as Node)) setSaveOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function applyDashboard(d: SavedDashboard) {
    setActiveId(d.id);
    onWidgetsChange(d.widgets as WidgetKey[]);
    setMenuOpen(false);
  }

  function resetToDefault() {
    setActiveId(null);
    onWidgetsChange(DEFAULT_WIDGETS);
    setMenuOpen(false);
  }

  async function saveDashboard(e: React.FormEvent) {
    e.preventDefault();
    if (!saveName.trim()) return;
    setSaving(true);
    const res = await fetch("/api/dashboard-views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: saveName.trim(), widgets, isDefault: saveAsDefault }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) {
      setDashboards((prev) => [...prev, data.data]);
      setActiveId(data.data.id);
      setSaveOpen(false);
      setSaveName("");
      setSaveAsDefault(false);
      toast.success("Dashboard saved");
    } else {
      toast.error(data.error ?? "Failed to save");
    }
  }

  async function deleteDashboard(d: SavedDashboard, e: React.MouseEvent) {
    e.stopPropagation();
    const res = await fetch(`/api/dashboard-views/${d.id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      setDashboards((prev) => prev.filter((v) => v.id !== d.id));
      if (activeId === d.id) resetToDefault();
      toast.success("Dashboard deleted");
    }
  }

  function onDragStart(key: WidgetKey) { dragKey.current = key; }
  function onDragOver(e: React.DragEvent, key: WidgetKey) {
    e.preventDefault();
    if (!dragKey.current || dragKey.current === key) return;
    const from = widgets.indexOf(dragKey.current);
    const to = widgets.indexOf(key);
    if (from === -1 || to === -1) return;
    const next = [...widgets];
    next.splice(from, 1);
    next.splice(to, 0, dragKey.current);
    onWidgetsChange(next);
    setActiveId(null);
  }
  function onDrop() { dragKey.current = null; }

  function toggleWidget(key: WidgetKey) {
    const next = widgets.includes(key) ? widgets.filter((w) => w !== key) : [...widgets, key];
    if (next.length === 0) return;
    onWidgetsChange(next);
    setActiveId(null);
  }

  const activeView = dashboards.find((d) => d.id === activeId);
  const defaultViews = dashboards.filter((d) => d.isDefault);
  const myViews = dashboards.filter((d) => !d.isDefault && d.createdById === userId);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Dashboard selector */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all
              ${menuOpen ? "bg-brand-800 text-white" : "bg-card border border-border text-foreground hover:bg-secondary"}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            {activeView?.name ?? "Default Dashboard"}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
          </button>

          {menuOpen && (
            <div className="absolute top-full left-0 mt-2 w-60 bg-card border border-border rounded-xl shadow-xl z-30 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
              <button onClick={resetToDefault} className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/80 flex items-center gap-2.5 transition-colors">
                {!activeId ? <Check className="w-4 h-4 text-brand-500" /> : <span className="w-4" />}
                <span className="font-medium">Default</span>
              </button>
              {defaultViews.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">Shared</div>
                  {defaultViews.map((d) => (
                    <DashboardMenuItem key={d.id} item={d} isActive={activeId === d.id} onApply={applyDashboard}
                      onDelete={userRole === "GLOBAL_ADMIN" ? deleteDashboard : undefined} />
                  ))}
                </>
              )}
              {myViews.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">My Dashboards</div>
                  {myViews.map((d) => (
                    <DashboardMenuItem key={d.id} item={d} isActive={activeId === d.id} onApply={applyDashboard} onDelete={deleteDashboard} />
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Widget picker toggle */}
        <button
          onClick={() => setPickerOpen((o) => !o)}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all
            ${pickerOpen ? "bg-brand-100 text-brand-800 border border-brand-300" : "bg-card border border-border text-foreground hover:bg-secondary"}`}
        >
          Widgets
          <span className="bg-brand-800 text-white rounded-full w-5 h-5 text-[11px] font-bold flex items-center justify-center">{widgets.length}</span>
        </button>

        {/* Save dashboard */}
        <div className="relative" ref={saveRef}>
          <button
            onClick={() => { setSaveOpen((o) => !o); setSaveName(activeView?.name ?? ""); }}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-brand-400/50 bg-brand-50/50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100/80 transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            Save dashboard
          </button>

          {saveOpen && (
            <form onSubmit={saveDashboard}
              className="absolute top-full left-0 mt-2 w-72 bg-card border border-border rounded-xl shadow-xl z-30 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
              <p className="text-sm font-semibold text-foreground">Save current dashboard</p>
              <input autoFocus placeholder="Dashboard name..." value={saveName} onChange={(e) => setSaveName(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300/30 focus:border-brand-500 transition-all" required />
              {userRole === "GLOBAL_ADMIN" && (
                <label className="flex items-center gap-2.5 text-sm text-muted-foreground cursor-pointer select-none">
                  <input type="checkbox" checked={saveAsDefault} onChange={(e) => setSaveAsDefault(e.target.checked)}
                    className="rounded border-border text-brand-600 focus:ring-brand-300/30" />
                  Share with all users
                </label>
              )}
              <div className="flex gap-2">
                <button type="submit" disabled={saving || !saveName.trim()}
                  className="flex-1 rounded-lg bg-brand-800 text-white text-sm font-medium py-2 disabled:opacity-40 hover:bg-brand-900 transition-colors">
                  {saving ? "Saving..." : "Save"}
                </button>
                <button type="button" onClick={() => setSaveOpen(false)}
                  className="px-3 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors">Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Widget picker panel */}
      {pickerOpen && (
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Customize widgets</p>
              <p className="text-xs text-muted-foreground mt-0.5">Drag to reorder, click to add or remove</p>
            </div>
            <button onClick={() => setPickerOpen(false)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-5">
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">Active ({widgets.length})</p>
              <div className="space-y-1">
                {widgets.map((key) => {
                  const def = ALL_WIDGETS.find((w) => w.key === key);
                  if (!def) return null;
                  return (
                    <div key={key} draggable onDragStart={() => onDragStart(key)} onDragOver={(e) => onDragOver(e, key)} onDrop={onDrop}
                      className="flex items-center gap-2 rounded-lg bg-brand-50 border border-brand-200/60 px-3 py-2 cursor-grab active:cursor-grabbing select-none group transition-all hover:border-brand-300">
                      <GripVertical className="w-3.5 h-3.5 text-brand-400/60 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-brand-800 truncate">{def.label}</p>
                        <p className="text-[11px] text-brand-500/60 truncate">{def.desc}</p>
                      </div>
                      <button onClick={() => toggleWidget(key)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-brand-200/60 text-brand-400 hover:text-brand-700 transition-all">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">Available</p>
              <div className="space-y-1">
                {ALL_WIDGETS.filter((w) => !widgets.includes(w.key)).map((def) => (
                  <button key={def.key} onClick={() => toggleWidget(def.key)}
                    className="w-full flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-left hover:border-brand-400 hover:text-brand-700 hover:bg-brand-50/50 transition-all">
                    <Plus className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground truncate">{def.label}</p>
                      <p className="text-[11px] text-muted-foreground/50 truncate">{def.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardMenuItem({
  item, isActive, onApply, onDelete,
}: {
  item: SavedDashboard;
  isActive: boolean;
  onApply: (d: SavedDashboard) => void;
  onDelete?: (d: SavedDashboard, e: React.MouseEvent) => void;
}) {
  return (
    <button onClick={() => onApply(item)}
      className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/80 flex items-center gap-2.5 group transition-colors">
      {isActive ? <Check className="w-4 h-4 text-brand-500" /> : <span className="w-4" />}
      <span className="flex-1 truncate font-medium">{item.name}</span>
      {onDelete && (
        <span role="button" onClick={(e) => onDelete(item, e)}
          className="hidden group-hover:flex items-center text-muted-foreground/50 hover:text-destructive transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </span>
      )}
    </button>
  );
}
