"use client";

import { ALL_COLUMNS, DEFAULT_COLUMNS } from "@/lib/column-definitions";
import { Check, ChevronDown, Columns3, GripVertical, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export type SavedView = {
  id: string;
  name: string;
  columns: string[];
  isDefault: boolean;
  createdById: string | null;
};

type Props = {
  columns: string[];
  onColumnsChange: (cols: string[]) => void;
  userRole: string;
  userId: string;
};

export function ViewBar({ columns, onColumnsChange, userRole, userId }: Props) {
  const [views, setViews] = useState<SavedView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement>(null);
  const saveRef = useRef<HTMLDivElement>(null);
  const dragKey = useRef<string | null>(null);

  useEffect(() => {
    fetch("/api/views")
      .then((r) => r.json())
      .then((d) => { if (d.success) setViews(d.data); });
  }, []);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) setViewMenuOpen(false);
      if (saveRef.current && !saveRef.current.contains(e.target as Node)) setSaveOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function applyView(view: SavedView) {
    setActiveViewId(view.id);
    onColumnsChange(view.columns as string[]);
    setViewMenuOpen(false);
  }

  function resetToDefault() {
    setActiveViewId(null);
    onColumnsChange(DEFAULT_COLUMNS);
    setViewMenuOpen(false);
  }

  async function saveView(e: React.FormEvent) {
    e.preventDefault();
    if (!saveName.trim()) return;
    setSaving(true);
    const res = await fetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: saveName.trim(), columns, isDefault: saveAsDefault }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) {
      setViews((prev) => [...prev, data.data]);
      setActiveViewId(data.data.id);
      setSaveOpen(false);
      setSaveName("");
      setSaveAsDefault(false);
      toast.success("View saved");
    } else {
      toast.error(data.error ?? "Failed to save view");
    }
  }

  async function deleteView(view: SavedView, e: React.MouseEvent) {
    e.stopPropagation();
    const res = await fetch(`/api/views/${view.id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      setViews((prev) => prev.filter((v) => v.id !== view.id));
      if (activeViewId === view.id) resetToDefault();
      toast.success("View deleted");
    }
  }

  function onDragStart(key: string) { dragKey.current = key; }
  function onDragOver(e: React.DragEvent, key: string) {
    e.preventDefault();
    if (!dragKey.current || dragKey.current === key) return;
    const from = columns.indexOf(dragKey.current);
    const to = columns.indexOf(key);
    if (from === -1 || to === -1) return;
    const next = [...columns];
    next.splice(from, 1);
    next.splice(to, 0, dragKey.current);
    onColumnsChange(next);
    setActiveViewId(null);
  }
  function onDrop() { dragKey.current = null; }

  function toggleColumn(key: string) {
    const next = columns.includes(key) ? columns.filter((c) => c !== key) : [...columns, key];
    if (next.length === 0) return;
    onColumnsChange(next);
    setActiveViewId(null);
  }

  const activeView = views.find((v) => v.id === activeViewId);
  const defaultViews = views.filter((v) => v.isDefault);
  const myViews = views.filter((v) => !v.isDefault && v.createdById === userId);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {/* View selector */}
        <div className="relative" ref={viewMenuRef}>
          <button
            onClick={() => setViewMenuOpen((o) => !o)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all
              ${viewMenuOpen ? "bg-brand-800 text-white" : "bg-card border border-border text-foreground hover:bg-secondary"}`}
          >
            <Columns3 className="w-4 h-4" />
            {activeView?.name ?? "Default View"}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${viewMenuOpen ? "rotate-180" : ""}`} />
          </button>

          {viewMenuOpen && (
            <div className="absolute top-full left-0 mt-2 w-60 bg-card border border-border rounded-xl shadow-xl z-30 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
              <button onClick={resetToDefault} className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/80 flex items-center gap-2.5 transition-colors">
                {!activeViewId ? <Check className="w-4 h-4 text-brand-500" /> : <span className="w-4" />}
                <span className="font-medium">Default</span>
              </button>

              {defaultViews.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">Shared Views</div>
                  {defaultViews.map((v) => (
                    <ViewMenuItem key={v.id} view={v} isActive={activeViewId === v.id} onApply={applyView}
                      onDelete={userRole === "GLOBAL_ADMIN" ? deleteView : undefined} />
                  ))}
                </>
              )}

              {myViews.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">My Views</div>
                  {myViews.map((v) => (
                    <ViewMenuItem key={v.id} view={v} isActive={activeViewId === v.id} onApply={applyView} onDelete={deleteView} />
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Column picker toggle */}
        <button
          onClick={() => setPickerOpen((o) => !o)}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all
            ${pickerOpen ? "bg-brand-100 text-brand-800 border border-brand-300" : "bg-card border border-border text-foreground hover:bg-secondary"}`}
        >
          Columns
          <span className="bg-brand-800 text-white rounded-full w-5 h-5 text-[11px] font-bold flex items-center justify-center">
            {columns.length}
          </span>
        </button>

        {/* Save view */}
        <div className="relative" ref={saveRef}>
          <button
            onClick={() => { setSaveOpen((o) => !o); setSaveName(activeView?.name ?? ""); }}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-brand-400/50 bg-brand-50/50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100/80 transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            Save view
          </button>

          {saveOpen && (
            <form
              onSubmit={saveView}
              className="absolute top-full left-0 mt-2 w-72 bg-card border border-border rounded-xl shadow-xl z-30 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150"
            >
              <p className="text-sm font-semibold text-foreground">Save current view</p>
              <input
                autoFocus
                placeholder="View name..."
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300/30 focus:border-brand-500 transition-all"
                required
              />
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
                  className="px-3 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Column picker panel */}
      {pickerOpen && (
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Customize columns</p>
              <p className="text-xs text-muted-foreground mt-0.5">Drag to reorder, click to add or remove</p>
            </div>
            <button onClick={() => setPickerOpen(false)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-5">
            {/* Active columns */}
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">Active ({columns.length})</p>
              <div className="space-y-1">
                {columns.map((key) => {
                  const col = ALL_COLUMNS.find((c) => c.key === key);
                  if (!col) return null;
                  return (
                    <div
                      key={key}
                      draggable
                      onDragStart={() => onDragStart(key)}
                      onDragOver={(e) => onDragOver(e, key)}
                      onDrop={onDrop}
                      className="flex items-center gap-2 rounded-lg bg-brand-50 border border-brand-200/60 px-3 py-2 cursor-grab active:cursor-grabbing select-none group transition-all hover:border-brand-300"
                    >
                      <GripVertical className="w-3.5 h-3.5 text-brand-400/60 shrink-0" />
                      <span className="flex-1 text-sm font-medium text-brand-800">{col.label}</span>
                      <button onClick={() => toggleColumn(key)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-brand-200/60 text-brand-400 hover:text-brand-700 transition-all">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Available columns */}
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">Available</p>
              <div className="space-y-1">
                {ALL_COLUMNS.filter((c) => !columns.includes(c.key)).map((col) => (
                  <button
                    key={col.key}
                    onClick={() => toggleColumn(col.key)}
                    className="w-full flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:border-brand-400 hover:text-brand-700 hover:bg-brand-50/50 transition-all text-left"
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span>{col.label}</span>
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

function ViewMenuItem({
  view, isActive, onApply, onDelete,
}: {
  view: SavedView;
  isActive: boolean;
  onApply: (v: SavedView) => void;
  onDelete?: (v: SavedView, e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={() => onApply(view)}
      className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/80 flex items-center gap-2.5 group transition-colors"
    >
      {isActive ? <Check className="w-4 h-4 text-brand-500" /> : <span className="w-4" />}
      <span className="flex-1 truncate font-medium">{view.name}</span>
      {onDelete && (
        <span
          role="button"
          onClick={(e) => onDelete(view, e)}
          className="hidden group-hover:flex items-center text-muted-foreground/50 hover:text-destructive transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </span>
      )}
    </button>
  );
}
