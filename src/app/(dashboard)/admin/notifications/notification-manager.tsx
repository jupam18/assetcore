"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Bell,
  BellOff,
  ChevronDown,
  ChevronRight,
  Clock,
  Code,
  Eye,
  Loader2,
  Mail,
  Pencil,
  Play,
  Plus,
  Save,
  Shield,
  Trash2,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type NotifRule = {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  conditions: Record<string, unknown> | null;
  recipients: Record<string, unknown>;
  subject: string;
  bodyHtml: string;
  isActive: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
};

type NotifLog = {
  id: string;
  ruleId: string | null;
  ruleName: string;
  trigger: string;
  recipient: string;
  subject: string;
  status: string;
  error: string | null;
  createdAt: string;
};

type Tab = "rules" | "log";

// ── Constants ─────────────────────────────────────────────────────────────────

const TRIGGER_META: Record<string, { label: string; icon: string; color: string }> = {
  status_change:  { label: "Status Change",   icon: "🔄", color: "bg-blue-50 text-blue-700 border-blue-200" },
  assignment:     { label: "Assignment",       icon: "👤", color: "bg-purple-50 text-purple-700 border-purple-200" },
  legal_hold:     { label: "Legal Hold",       icon: "⚖️", color: "bg-red-50 text-red-700 border-red-200" },
  warranty_expiry:{ label: "Warranty Expiry",  icon: "📅", color: "bg-amber-50 text-amber-700 border-amber-200" },
  asset_created:  { label: "Asset Created",    icon: "✨", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  note_added:     { label: "Note Added",       icon: "📝", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
};

const RECIPIENT_LABELS: Record<string, string> = {
  assignee: "Assigned user",
  performer: "User who performed the action",
  role: "All users with a specific role",
  country_leads: "Country Leads for asset's country",
  emails: "Custom email addresses",
};

const ALL_STATUSES = ["IN_STOCK", "DEPLOYED", "IN_MAINTENANCE", "PENDING_RETURN", "LEGAL_HOLD", "RETIRED", "DISPOSED"];
const STATUS_LABELS: Record<string, string> = {
  IN_STOCK: "In Stock", DEPLOYED: "Deployed", IN_MAINTENANCE: "In Maintenance",
  PENDING_RETURN: "Pending Return", LEGAL_HOLD: "Legal Hold", RETIRED: "Retired", DISPOSED: "Disposed",
};

const PLACEHOLDER_VARS = [
  { var: "{{asset.serialNumber}}", desc: "Asset serial number" },
  { var: "{{asset.model}}", desc: "Asset model" },
  { var: "{{asset.deviceName}}", desc: "Asset device name" },
  { var: "{{asset.assetTag}}", desc: "Asset tag" },
  { var: "{{asset.type}}", desc: "Asset type (Notebook, Monitor...)" },
  { var: "{{performer.name}}", desc: "Person who triggered the action" },
  { var: "{{assignee.name}}", desc: "Person asset is assigned to" },
  { var: "{{fromStatus}}", desc: "Previous status" },
  { var: "{{toStatus}}", desc: "New status" },
  { var: "{{notes}}", desc: "Transition notes" },
  { var: "{{appUrl}}", desc: "Application URL" },
];

// ── Main Component ────────────────────────────────────────────────────────────

type Props = {
  initialRules: NotifRule[];
  initialLogs: NotifLog[];
};

export function NotificationManager({ initialRules, initialLogs }: Props) {
  const [tab, setTab] = useState<Tab>("rules");
  const [rules, setRules] = useState<NotifRule[]>(initialRules);
  const [logs] = useState<NotifLog[]>(initialLogs);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Email Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage automated email notifications triggered by asset events.
          </p>
        </div>
        <button
          onClick={() => { setCreating(true); setEditingId(null); }}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-brand-800 text-white text-sm font-medium hover:bg-brand-900 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Rule
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/30 p-1 rounded-xl w-fit">
        {(["rules", "log"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "rules" ? <Bell className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            {t === "rules" ? `Rules (${rules.length})` : `Send Log (${logs.length})`}
          </button>
        ))}
      </div>

      {/* Create form */}
      {creating && (
        <RuleEditor
          rule={null}
          onSave={(saved) => {
            setRules((prev) => [...prev, saved]);
            setCreating(false);
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      {/* Rules tab */}
      {tab === "rules" && (
        <div className="space-y-3">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              isEditing={editingId === rule.id}
              onEdit={() => setEditingId(editingId === rule.id ? null : rule.id)}
              onToggle={async () => {
                const res = await fetch(`/api/admin/notifications/${rule.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ isActive: !rule.isActive }),
                });
                const data = await res.json();
                if (data.success) {
                  setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, isActive: !r.isActive } : r));
                  toast.success(`Notification ${!rule.isActive ? "enabled" : "disabled"}`);
                }
              }}
              onDelete={async () => {
                if (!confirm("Delete this notification rule?")) return;
                const res = await fetch(`/api/admin/notifications/${rule.id}`, { method: "DELETE" });
                const data = await res.json();
                if (data.success) {
                  setRules((prev) => prev.filter((r) => r.id !== rule.id));
                  toast.success("Rule deleted");
                } else {
                  toast.error(data.error ?? "Cannot delete");
                }
              }}
              onSave={(saved) => {
                setRules((prev) => prev.map((r) => r.id === saved.id ? saved : r));
                setEditingId(null);
              }}
            />
          ))}
          {rules.length === 0 && (
            <div className="bg-card border border-border rounded-xl p-16 text-center">
              <BellOff className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No notification rules configured.</p>
            </div>
          )}
        </div>
      )}

      {/* Log tab */}
      {tab === "log" && <LogTable logs={logs} />}
    </div>
  );
}

// ── Rule Card ─────────────────────────────────────────────────────────────────

function RuleCard({
  rule, isEditing, onEdit, onToggle, onDelete, onSave,
}: {
  rule: NotifRule;
  isEditing: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onSave: (r: NotifRule) => void;
}) {
  const [testing, setTesting] = useState(false);
  const meta = TRIGGER_META[rule.trigger] ?? { label: rule.trigger, icon: "📧", color: "bg-gray-50 text-gray-700 border-gray-200" };
  const recipientType = (rule.recipients as { type: string }).type;
  const recipientRole = (rule.recipients as { role?: string }).role;

  async function sendTest() {
    setTesting(true);
    const res = await fetch(`/api/admin/notifications/${rule.id}/test`, { method: "POST" });
    const data = await res.json();
    setTesting(false);
    if (data.success) toast.success(data.message);
    else toast.error(data.error ?? "Test failed. Check SMTP settings.");
  }

  return (
    <div className={`bg-card border rounded-xl overflow-hidden transition-all ${rule.isActive ? "border-border" : "border-border/50 opacity-60"} ${isEditing ? "shadow-lg ring-2 ring-brand-300/30" : "shadow-sm"}`}>
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Toggle */}
        <button
          onClick={onToggle}
          className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${rule.isActive ? "bg-brand-500" : "bg-border"}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${rule.isActive ? "translate-x-4" : ""}`} />
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-foreground truncate">{rule.name}</span>
            {rule.isSystem && (
              <span className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-muted text-muted-foreground">
                <Shield className="w-2.5 h-2.5" /> System
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border ${meta.color}`}>
              {meta.icon} {meta.label}
            </span>
            <span>→</span>
            <span>{RECIPIENT_LABELS[recipientType] ?? recipientType}</span>
            {recipientRole && <span className="text-muted-foreground/50">({recipientRole.replace(/_/g, " ")})</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={sendTest}
            disabled={testing || !rule.isActive}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border bg-card text-foreground hover:bg-secondary transition-colors disabled:opacity-30"
          >
            {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
            Test
          </button>
          <button
            onClick={onEdit}
            className={`p-2 rounded-lg transition-colors ${isEditing ? "bg-brand-100 text-brand-700" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
          >
            {isEditing ? <ChevronDown className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
          </button>
          {!rule.isSystem && (
            <button onClick={onDelete} className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Editor */}
      {isEditing && (
        <RuleEditor rule={rule} onSave={onSave} onCancel={onEdit} />
      )}
    </div>
  );
}

// ── Rule Editor ───────────────────────────────────────────────────────────────

function RuleEditor({
  rule, onSave, onCancel,
}: {
  rule: NotifRule | null;
  onSave: (r: NotifRule) => void;
  onCancel: () => void;
}) {
  const isNew = !rule;
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showVars, setShowVars] = useState(false);

  const [form, setForm] = useState({
    name: rule?.name ?? "",
    description: rule?.description ?? "",
    trigger: rule?.trigger ?? "status_change",
    recipientType: (rule?.recipients as { type: string })?.type ?? "country_leads",
    recipientRole: (rule?.recipients as { role?: string })?.role ?? "GLOBAL_ADMIN",
    recipientEmails: ((rule?.recipients as { addresses?: string[] })?.addresses ?? []).join(", "),
    subject: rule?.subject ?? "",
    bodyHtml: rule?.bodyHtml ?? "",
    // Status conditions
    toStatuses: ((rule?.conditions as { toStatus?: string[] })?.toStatus ?? []) as string[],
    fromStatuses: ((rule?.conditions as { fromStatus?: string[] })?.fromStatus ?? []) as string[],
  });

  function toggleStatus(field: "toStatuses" | "fromStatuses", status: string) {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(status)
        ? prev[field].filter((s) => s !== status)
        : [...prev[field], status],
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const conditions: Record<string, unknown> = {};
    if (form.toStatuses.length > 0) conditions.toStatus = form.toStatuses;
    if (form.fromStatuses.length > 0) conditions.fromStatus = form.fromStatuses;

    const recipients: Record<string, unknown> = { type: form.recipientType };
    if (form.recipientType === "role") recipients.role = form.recipientRole;
    if (form.recipientType === "emails") {
      recipients.addresses = form.recipientEmails.split(",").map((e) => e.trim()).filter(Boolean);
    }

    const payload = {
      name: form.name,
      description: form.description || null,
      trigger: form.trigger,
      conditions,
      recipients,
      subject: form.subject,
      bodyHtml: form.bodyHtml,
    };

    const url = isNew ? "/api/admin/notifications" : `/api/admin/notifications/${rule!.id}`;
    const method = isNew ? "POST" : "PATCH";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);

    if (data.success) {
      toast.success(isNew ? "Rule created" : "Rule updated");
      onSave(data.data);
    } else {
      toast.error(data.error ?? "Save failed");
    }
  }

  const selectClass = "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300/20 transition-all";
  const inputClass = selectClass;

  return (
    <form onSubmit={handleSave} className="border-t border-border bg-muted/10 px-5 py-5 space-y-5">
      {/* Name & Description */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground">Name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className={inputClass} placeholder="e.g. Deploy — Notify Assignee" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground">Description</label>
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} placeholder="Optional description" />
        </div>
      </div>

      {/* Trigger & Recipients */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground">Trigger Event</label>
          <select value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })} className={selectClass}>
            {Object.entries(TRIGGER_META).map(([key, val]) => (
              <option key={key} value={key}>{val.icon} {val.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground">Recipients</label>
          <select value={form.recipientType} onChange={(e) => setForm({ ...form, recipientType: e.target.value })} className={selectClass}>
            {Object.entries(RECIPIENT_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        {form.recipientType === "role" && (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Role</label>
            <select value={form.recipientRole} onChange={(e) => setForm({ ...form, recipientRole: e.target.value })} className={selectClass}>
              <option value="GLOBAL_ADMIN">Global Admin</option>
              <option value="COUNTRY_LEAD">Country Lead</option>
              <option value="TECHNICIAN">Technician</option>
            </select>
          </div>
        )}
        {form.recipientType === "emails" && (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Email addresses</label>
            <input
              value={form.recipientEmails}
              onChange={(e) => setForm({ ...form, recipientEmails: e.target.value })}
              className={inputClass}
              placeholder="admin@example.com, ops@example.com"
            />
          </div>
        )}
      </div>

      {/* Status conditions (only for status_change trigger) */}
      {form.trigger === "status_change" && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-foreground">Status Conditions <span className="text-muted-foreground font-normal">(leave empty to match any status)</span></p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="text-[11px] text-muted-foreground">Trigger when changing TO:</p>
              <div className="flex flex-wrap gap-1.5">
                {ALL_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleStatus("toStatuses", s)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                      form.toStatuses.includes(s)
                        ? "bg-brand-100 text-brand-800 border-brand-300"
                        : "bg-card text-muted-foreground border-border hover:border-brand-300"
                    }`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] text-muted-foreground">Trigger when changing FROM:</p>
              <div className="flex flex-wrap gap-1.5">
                {ALL_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleStatus("fromStatuses", s)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                      form.fromStatuses.includes(s)
                        ? "bg-brand-100 text-brand-800 border-brand-300"
                        : "bg-card text-muted-foreground border-border hover:border-brand-300"
                    }`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subject */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground">Email Subject</label>
          <button type="button" onClick={() => setShowVars((v) => !v)} className="text-[11px] text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1 transition-colors">
            <Code className="w-3 h-3" /> {showVars ? "Hide" : "Show"} variables
          </button>
        </div>
        <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required className={inputClass} placeholder="AssetCore — {{asset.serialNumber}} status changed" />
      </div>

      {/* Variable reference */}
      {showVars && (
        <div className="bg-muted/30 border border-border rounded-lg p-3">
          <p className="text-[11px] font-semibold text-muted-foreground mb-2">Available template variables:</p>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {PLACEHOLDER_VARS.map((v) => (
              <div key={v.var} className="flex items-center gap-2">
                <code className="text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded font-mono text-[11px]">{v.var}</code>
                <span className="text-muted-foreground truncate">{v.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Body HTML */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground">Email Body (HTML)</label>
          <button type="button" onClick={() => setShowPreview((v) => !v)} className="text-[11px] text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1 transition-colors">
            <Eye className="w-3 h-3" /> {showPreview ? "Edit" : "Preview"}
          </button>
        </div>
        {showPreview ? (
          <div className="border border-border rounded-lg overflow-hidden bg-white">
            <div
              className="p-4 text-sm"
              dangerouslySetInnerHTML={{
                __html: form.bodyHtml
                  .replaceAll("{{asset.serialNumber}}", "SN-DEMO-001")
                  .replaceAll("{{asset.model}}", "ThinkPad T14 Gen 4")
                  .replaceAll("{{asset.deviceName}}", "Demo Device")
                  .replaceAll("{{asset.assetTag}}", "DEMO-TAG")
                  .replaceAll("{{asset.type}}", "Notebook")
                  .replaceAll("{{performer.name}}", "John Doe")
                  .replaceAll("{{assignee.name}}", "Jane Smith")
                  .replaceAll("{{fromStatus}}", "In Stock")
                  .replaceAll("{{toStatus}}", "Deployed")
                  .replaceAll("{{notes}}", "Sample transition notes")
                  .replaceAll("{{appUrl}}", "#")
                  .replace(/\{\{#if .*?\}\}/g, "")
                  .replace(/\{\{\/if\}\}/g, ""),
              }}
            />
          </div>
        ) : (
          <textarea
            value={form.bodyHtml}
            onChange={(e) => setForm({ ...form, bodyHtml: e.target.value })}
            required
            rows={10}
            className={`${inputClass} font-mono text-xs resize-y`}
            placeholder="<h2>Email Body</h2><p>Use {{variables}} for dynamic content.</p>"
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">
          <X className="w-3.5 h-3.5 inline mr-1.5" />Cancel
        </button>
        <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-brand-800 text-white text-sm font-medium hover:bg-brand-900 disabled:opacity-40 transition-all shadow-sm">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {saving ? "Saving…" : isNew ? "Create Rule" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

// ── Log Table ─────────────────────────────────────────────────────────────────

function LogTable({ logs }: { logs: NotifLog[] }) {
  const STATUS_ICON: Record<string, typeof CheckCircle2> = {
    sent: CheckCircle2,
    failed: XCircle,
    skipped: AlertTriangle,
  };
  const STATUS_STYLE: Record<string, string> = {
    sent: "text-emerald-600",
    failed: "text-destructive",
    skipped: "text-amber-500",
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30">Timestamp</th>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30">Rule</th>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30">Recipient</th>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30">Subject</th>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30">Error</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                <Mail className="w-6 h-6 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm">No emails sent yet. Test a notification rule to see entries here.</p>
              </td>
            </tr>
          )}
          {logs.map((log, i) => {
            const Icon = STATUS_ICON[log.status] ?? CheckCircle2;
            return (
              <tr key={log.id} className={`hover:bg-brand-50/30 transition-colors ${i !== logs.length - 1 ? "border-b border-border/50" : ""}`}>
                <td className="px-4 py-3">
                  <Icon className={`w-4 h-4 ${STATUS_STYLE[log.status] ?? "text-muted-foreground"}`} />
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground font-mono whitespace-nowrap">
                  {log.createdAt.slice(0, 16).replace("T", " ")}
                </td>
                <td className="px-4 py-3 text-foreground font-medium text-xs truncate max-w-[180px]">
                  {log.ruleName}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[180px]">
                  {log.recipient}
                </td>
                <td className="px-4 py-3 text-xs text-foreground truncate max-w-[250px]">
                  {log.subject}
                </td>
                <td className="px-4 py-3 text-xs text-destructive truncate max-w-[200px]">
                  {log.error ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
