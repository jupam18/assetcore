"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Pin, PinOff } from "lucide-react";

type Note = {
  id: string;
  text: string;
  category: string;
  visibility: string;
  isPinned: boolean;
  createdAt: string;
  author: { id: string; name: string; email: string } | null;
};

const CATEGORY_COLORS: Record<string, string> = {
  GENERAL: "bg-gray-100 text-gray-600",
  MAINTENANCE: "bg-orange-100 text-orange-700",
  INCIDENT: "bg-red-100 text-red-700",
  TRANSFER: "bg-blue-100 text-blue-700",
  PROCUREMENT: "bg-green-100 text-green-700",
};

const CATEGORY_LABELS: Record<string, string> = {
  GENERAL: "General",
  MAINTENANCE: "Maintenance",
  INCIDENT: "Incident",
  TRANSFER: "Transfer",
  PROCUREMENT: "Procurement",
};

const VISIBILITY_LABELS: Record<string, string> = {
  ALL_USERS: "All users",
  COUNTRY_LEADS_ONLY: "Country leads+",
  ADMINS_ONLY: "Admins only",
};

export function NotesTab({
  assetId,
  userRole,
  userId,
}: {
  assetId: string;
  userRole: string;
  userId: string;
}) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [visibility, setVisibility] = useState("ALL_USERS");
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function fetchNotes() {
    fetch(`/api/assets/${assetId}/notes`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setNotes(d.data); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchNotes(); }, [assetId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/assets/${assetId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), category, visibility, isPinned }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Failed to save note.");
      } else {
        setText("");
        setCategory("GENERAL");
        setVisibility("ALL_USERS");
        setIsPinned(false);
        fetchNotes();
      }
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  const canViewAll = userRole === "GLOBAL_ADMIN" || userRole === "COUNTRY_LEAD";

  const visibleNotes = notes.filter((n) => {
    if (n.visibility === "ALL_USERS") return true;
    if (n.visibility === "COUNTRY_LEADS_ONLY") return canViewAll;
    if (n.visibility === "ADMINS_ONLY") return userRole === "GLOBAL_ADMIN";
    return false;
  });

  return (
    <div className="space-y-6">
      {/* Add note form */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Add Note</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
            placeholder="Write a note…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
          />

          <div className="flex flex-wrap gap-3 items-center">
            <select
              className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>

            <select
              className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
            >
              {Object.entries(VISIBILITY_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>

            <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="rounded border-gray-300"
              />
              Pin note
            </label>

            <div className="ml-auto">
              <Button type="submit" size="sm" disabled={submitting || !text.trim()}>
                {submitting ? "Saving…" : "Add Note"}
              </Button>
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </form>
      </div>

      {/* Notes list */}
      <div className="space-y-3">
        {loading && (
          <p className="text-sm text-gray-400 p-4">Loading notes…</p>
        )}
        {!loading && visibleNotes.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-400">
            No notes yet.
          </div>
        )}
        {visibleNotes.map((note) => (
          <div
            key={note.id}
            className={`bg-white border rounded-xl p-4 space-y-2 ${note.isPinned ? "border-blue-300 bg-blue-50/30" : "border-gray-200"}`}
          >
            <div className="flex items-start gap-2">
              {note.isPinned && (
                <Pin className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
              )}
              <p className="text-sm text-gray-800 flex-1 whitespace-pre-wrap">{note.text}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${CATEGORY_COLORS[note.category] ?? "bg-gray-100 text-gray-600"}`}>
                {CATEGORY_LABELS[note.category] ?? note.category}
              </span>
              {note.visibility !== "ALL_USERS" && (
                <span className="inline-flex items-center rounded-full px-2 py-0.5 bg-yellow-100 text-yellow-700 font-medium">
                  {VISIBILITY_LABELS[note.visibility] ?? note.visibility}
                </span>
              )}
              <span>
                {note.author?.name ?? "Unknown"} · {new Date(note.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
