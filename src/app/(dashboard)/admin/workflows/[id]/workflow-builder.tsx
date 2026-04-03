"use client";

import {
  addEdge,
  Background,
  BackgroundVariant,
  Connection,
  Controls,
  Edge,
  Handle,
  MiniMap,
  Node,
  NodeProps,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { WfState, WfTransition } from "@/lib/workflow-engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────────────────────

type WorkflowData = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  states: WfState[];
  transitions: WfTransition[];
};

type Props = {
  workflow: WorkflowData | null;
  assetCount: number;
};

const STATE_TYPES = ["initial", "active", "special", "terminal"] as const;
const ALL_ROLES = ["GLOBAL_ADMIN", "COUNTRY_LEAD", "TECHNICIAN"];
const AUTO_ACTIONS = [
  "setDeployedDate",
  "setReturnDate",
  "createAssignment",
  "closeAssignment",
  "storePreviousStatus",
  "restorePreviousStatus",
];

const TYPE_COLORS: Record<string, string> = {
  initial: "#6b7280",
  active: "#2563eb",
  special: "#dc2626",
  terminal: "#111827",
};

// ── Custom Node ──────────────────────────────────────────────────────────────

function StateNode({ data, selected }: NodeProps) {
  const d = data as { label: string; stateType: string; color: string; isSpecial?: boolean };
  return (
    <div
      className={`rounded-xl border-2 px-4 py-3 min-w-[130px] text-center shadow-sm transition-all ${
        selected ? "border-blue-500 shadow-blue-100 shadow-md" : "border-gray-300"
      }`}
      style={{ background: `${d.color}18`, borderColor: selected ? "#3b82f6" : d.color }}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2" />
      <div className="text-xs font-semibold" style={{ color: d.color }}>{d.label}</div>
      <div className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">{d.stateType}</div>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2" />
    </div>
  );
}

const nodeTypes = { stateNode: StateNode };

// ── Conversion helpers ───────────────────────────────────────────────────────

function statesToNodes(states: WfState[]): Node[] {
  return states.map((s, i) => ({
    id: s.name,
    type: "stateNode",
    position: s.position ?? { x: 200 * (i % 4), y: 180 * Math.floor(i / 4) },
    data: {
      label: s.label,
      stateType: s.type,
      color: s.color ?? TYPE_COLORS[s.type] ?? "#6b7280",
    },
  }));
}

function transitionsToEdges(transitions: WfTransition[]): Edge[] {
  return transitions
    .filter((t) => t.from !== "*" && t.to !== "*")
    .map((t, i) => ({
      id: `e-${t.from}-${t.to}-${i}`,
      source: t.from,
      target: t.to,
      label: t.name,
      type: "smoothstep",
      style: { stroke: "#6b7280" },
      labelStyle: { fontSize: 10, fill: "#374151" },
      labelBgStyle: { fill: "#f9fafb", fillOpacity: 0.9 },
      data: { roles: t.roles, autoActions: t.autoActions ?? [] },
    }));
}

function nodesToStates(nodes: Node[], _original: WfState[]): WfState[] {
  return nodes.map((n) => {
    const d = n.data as { label: string; stateType: string; color: string };
    return {
      name: n.id,
      label: d.label,
      color: d.color,
      type: d.stateType as WfState["type"],
      position: n.position,
    };
  });
}

function edgesToTransitions(edges: Edge[], extra: WfTransition[]): WfTransition[] {
  const fromEdges: WfTransition[] = edges.map((e) => ({
    from: e.source,
    to: e.target,
    name: (e.label as string) ?? `${e.source} → ${e.target}`,
    roles: (e.data as { roles: string[] })?.roles ?? ALL_ROLES,
    autoActions: (e.data as { autoActions: string[] })?.autoActions ?? [],
  }));
  // Preserve wildcard transitions (legal hold special cases)
  const wildcards = extra.filter((t) => t.from === "*" || t.to === "*");
  return [...fromEdges, ...wildcards];
}

// ── Main Builder ─────────────────────────────────────────────────────────────

export function WorkflowBuilder({ workflow, assetCount }: Props) {
  const router = useRouter();
  const isNew = !workflow;

  const [name, setName] = useState(workflow?.name ?? "New Workflow");
  const [description, setDescription] = useState(workflow?.description ?? "");
  const [isActive, setIsActive] = useState(workflow?.isActive ?? false);
  const [saving, setSaving] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState(
    workflow ? statesToNodes(workflow.states) : getDefaultNodes()
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    workflow ? transitionsToEdges(workflow.transitions) : getDefaultEdges()
  );

  // Selected element for the side panel
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge = {
        ...connection,
        id: `e-${connection.source}-${connection.target}-${Date.now()}`,
        label: "New Transition",
        type: "smoothstep",
        style: { stroke: "#6b7280" },
        labelStyle: { fontSize: 10, fill: "#374151" },
        labelBgStyle: { fill: "#f9fafb", fillOpacity: 0.9 },
        data: { roles: ALL_ROLES, autoActions: [] },
      };
      setEdges((eds) => addEdge(newEdge, eds));
      setSelectedEdge(newEdge);
      setSelectedNode(null);
    },
    [setEdges]
  );

  function addState() {
    const name = `state_${Date.now()}`;
    const newNode: Node = {
      id: name,
      type: "stateNode",
      position: { x: 100 + Math.random() * 300, y: 100 + Math.random() * 200 },
      data: { label: "New State", stateType: "active", color: "#2563eb" },
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedNode(newNode);
    setSelectedEdge(null);
  }

  function deleteSelected() {
    if (selectedNode) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
      setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
      setSelectedNode(null);
    }
    if (selectedEdge) {
      setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
      setSelectedEdge(null);
    }
  }

  function updateNodeData(key: string, value: string) {
    if (!selectedNode) return;
    const updated = { ...selectedNode, data: { ...selectedNode.data, [key]: value } };
    setNodes((nds) => nds.map((n) => (n.id === selectedNode.id ? updated : n)));
    setSelectedNode(updated);
  }

  function updateEdgeData(key: string, value: unknown) {
    if (!selectedEdge) return;
    const updated = {
      ...selectedEdge,
      ...(key === "label" ? { label: value as string } : {}),
      data: { ...(selectedEdge.data ?? {}), [key]: value },
    };
    setEdges((eds) => eds.map((e) => (e.id === selectedEdge.id ? updated : e)));
    setSelectedEdge(updated);
  }

  function toggleRole(role: string) {
    if (!selectedEdge) return;
    const roles = ((selectedEdge.data as { roles: string[] })?.roles ?? []) as string[];
    const next = roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role];
    updateEdgeData("roles", next);
  }

  function toggleAutoAction(action: string) {
    if (!selectedEdge) return;
    const actions = ((selectedEdge.data as { autoActions: string[] })?.autoActions ?? []) as string[];
    const next = actions.includes(action) ? actions.filter((a) => a !== action) : [...actions, action];
    updateEdgeData("autoActions", next);
  }

  async function save() {
    setSaving(true);
    const states = nodesToStates(nodes, workflow?.states ?? []);
    const transitions = edgesToTransitions(edges, workflow?.transitions ?? []);

    const payload = { name, description: description || null, states, transitions, isActive };

    let res: Response;
    if (isNew) {
      res = await fetch("/api/admin/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch(`/api/admin/workflows/${workflow!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    const data = await res.json();
    setSaving(false);

    if (data.success) {
      toast.success(isNew ? "Workflow created." : "Workflow saved.");
      if (isNew) router.push(`/admin/workflows/${data.data.id}`);
      else router.refresh();
    } else {
      toast.error(data.error ?? "Save failed.");
    }
  }

  const edgeRoles = ((selectedEdge?.data as { roles?: string[] })?.roles ?? []) as string[];
  const edgeActions = ((selectedEdge?.data as { autoActions?: string[] })?.autoActions ?? []) as string[];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-200 bg-white shrink-0">
        <Link href="/admin/workflows" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 flex items-center gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-xl font-semibold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 transition-colors"
          />
          {workflow?.isActive && (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700">Active</span>
          )}
          {assetCount > 0 && (
            <span className="text-xs text-gray-400">{assetCount} asset{assetCount !== 1 ? "s" : ""} on this workflow</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={addState}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add State
          </button>
          {(selectedNode || selectedEdge) && (
            <button
              onClick={deleteSelected}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 px-3 py-1.5 text-sm hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          )}
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save Workflow"}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Canvas */}
        <div className="flex-1 min-w-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => { setSelectedNode(node); setSelectedEdge(null); }}
            onEdgeClick={(_, edge) => { setSelectedEdge(edge); setSelectedNode(null); }}
            onPaneClick={() => { setSelectedNode(null); setSelectedEdge(null); }}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            deleteKeyCode="Delete"
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
            <Controls />
            <MiniMap nodeColor={(n) => (n.data as { color: string }).color ?? "#6b7280"} pannable zoomable />
          </ReactFlow>
        </div>

        {/* Side panel */}
        <aside className="w-72 shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
          {!selectedNode && !selectedEdge && (
            <div className="p-5 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Workflow Settings</h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Description</Label>
                    <textarea
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe this workflow…"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-gray-700">Set as active workflow</span>
                  </label>
                  {isActive && (
                    <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                      Activating this workflow will deactivate all others. Existing assets will continue on their current workflow version.
                    </p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">How to use</h3>
                <ul className="text-xs text-gray-500 space-y-1.5">
                  <li>• Click <strong>Add State</strong> to add a new state node</li>
                  <li>• Drag from the bottom handle of a node to another node's top handle to create a transition</li>
                  <li>• Click any state or transition to edit it in this panel</li>
                  <li>• Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Delete</kbd> or use the Delete button to remove selected elements</li>
                  <li>• Click <strong>Save Workflow</strong> when done</li>
                </ul>
              </div>
            </div>
          )}

          {selectedNode && (
            <div className="p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Edit State</h3>
              <div className="space-y-1">
                <Label>Label</Label>
                <Input
                  value={(selectedNode.data as { label: string }).label}
                  onChange={(e) => updateNodeData("label", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Internal Name</Label>
                <Input value={selectedNode.id} disabled className="font-mono text-xs bg-gray-50" />
                <p className="text-xs text-gray-400">Cannot be changed after creation.</p>
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <select
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  value={(selectedNode.data as { stateType: string }).stateType}
                  onChange={(e) => updateNodeData("stateType", e.target.value)}
                >
                  {STATE_TYPES.map((t) => (
                    <option key={t} value={t} className="capitalize">{t}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={(selectedNode.data as { color: string }).color}
                    onChange={(e) => updateNodeData("color", e.target.value)}
                    className="w-10 h-9 rounded border border-gray-200 cursor-pointer"
                  />
                  <Input
                    value={(selectedNode.data as { color: string }).color}
                    onChange={(e) => updateNodeData("color", e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {selectedEdge && (
            <div className="p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Edit Transition</h3>
              <div className="space-y-1">
                <Label>Name</Label>
                <Input
                  value={(selectedEdge.label as string) ?? ""}
                  onChange={(e) => updateEdgeData("label", e.target.value)}
                />
              </div>
              <div className="text-xs text-gray-400 font-mono bg-gray-50 rounded-lg px-3 py-2">
                {selectedEdge.source} → {selectedEdge.target}
              </div>
              <div className="space-y-2">
                <Label>Allowed Roles</Label>
                {ALL_ROLES.map((role) => (
                  <label key={role} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={edgeRoles.includes(role)}
                      onChange={() => toggleRole(role)}
                      className="rounded"
                    />
                    <span className="text-gray-700">{role.replace(/_/g, " ")}</span>
                  </label>
                ))}
              </div>
              <div className="space-y-2">
                <Label>Auto-Actions</Label>
                {AUTO_ACTIONS.map((action) => (
                  <label key={action} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={edgeActions.includes(action)}
                      onChange={() => toggleAutoAction(action)}
                      className="rounded"
                    />
                    <span className="text-gray-600 font-mono text-xs">{action}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

// ── Default nodes/edges for a brand-new workflow ─────────────────────────────

function getDefaultNodes(): Node[] {
  return [
    { id: "in_stock", type: "stateNode", position: { x: 250, y: 0 }, data: { label: "In Stock", stateType: "initial", color: "#6b7280" } },
    { id: "deployed", type: "stateNode", position: { x: 100, y: 150 }, data: { label: "Deployed", stateType: "active", color: "#2563eb" } },
    { id: "in_maintenance", type: "stateNode", position: { x: 400, y: 150 }, data: { label: "In Maintenance", stateType: "active", color: "#f59e0b" } },
    { id: "pending_return", type: "stateNode", position: { x: 100, y: 300 }, data: { label: "Pending Return", stateType: "active", color: "#8b5cf6" } },
    { id: "legal_hold", type: "stateNode", position: { x: 400, y: 300 }, data: { label: "Legal Hold", stateType: "special", color: "#dc2626" } },
    { id: "retired", type: "stateNode", position: { x: 150, y: 450 }, data: { label: "Retired", stateType: "terminal", color: "#374151" } },
    { id: "disposed", type: "stateNode", position: { x: 350, y: 450 }, data: { label: "Disposed", stateType: "terminal", color: "#111827" } },
  ];
}

function getDefaultEdges(): Edge[] {
  const e = (id: string, source: string, target: string, label: string, roles: string[], autoActions: string[] = []): Edge => ({
    id, source, target, label, type: "smoothstep",
    style: { stroke: "#6b7280" },
    labelStyle: { fontSize: 10, fill: "#374151" },
    labelBgStyle: { fill: "#f9fafb", fillOpacity: 0.9 },
    data: { roles, autoActions },
  });

  return [
    e("e1", "in_stock", "deployed", "Deploy", ALL_ROLES, ["setDeployedDate", "createAssignment"]),
    e("e2", "in_stock", "in_maintenance", "Send to Maintenance", ALL_ROLES),
    e("e3", "deployed", "pending_return", "Request Return", ALL_ROLES),
    e("e4", "deployed", "in_stock", "Return", ALL_ROLES, ["setReturnDate", "closeAssignment"]),
    e("e5", "pending_return", "in_stock", "Confirm Return", ALL_ROLES, ["setReturnDate", "closeAssignment"]),
    e("e6", "in_maintenance", "in_stock", "Return from Maintenance", ALL_ROLES),
    e("e7", "in_stock", "retired", "Retire", ["GLOBAL_ADMIN"]),
    e("e8", "retired", "disposed", "Dispose", ["GLOBAL_ADMIN"]),
  ];
}
