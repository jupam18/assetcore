import { AssetStatus } from "@prisma/client";
import { prisma } from "./prisma";

// ── Types matching the JSON shapes stored in the Workflow model ──────────────

export type WfState = {
  name: string;       // e.g. "in_stock"
  label: string;      // e.g. "In Stock"
  color: string;
  type: "initial" | "active" | "special" | "terminal";
  position?: { x: number; y: number }; // for the builder UI
};

export type WfTransition = {
  from: string;       // state name or "*"
  to: string;         // state name or "*"
  name: string;
  roles: string[];
  autoActions?: string[];
};

export type WorkflowDef = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  states: WfState[];
  transitions: WfTransition[];
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** AssetStatus enum → workflow state name */
export function statusToState(status: AssetStatus): string {
  return status.toLowerCase();
}

/** Workflow state name → AssetStatus enum */
export function stateToStatus(state: string): AssetStatus {
  return state.toUpperCase() as AssetStatus;
}

/** Load the active default workflow (Hardware Lifecycle). */
export async function getDefaultWorkflow(): Promise<WorkflowDef | null> {
  const wf = await prisma.workflow.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });
  if (!wf) return null;
  return {
    id: wf.id,
    name: wf.name,
    description: wf.description,
    isActive: wf.isActive,
    states: wf.states as WfState[],
    transitions: wf.transitions as WfTransition[],
  };
}

/** Load the workflow assigned to a specific asset via its WorkflowInstance. */
export async function getWorkflowForAsset(assetId: string): Promise<WorkflowDef | null> {
  const instance = await prisma.workflowInstance.findUnique({ where: { assetId } });
  if (!instance) return getDefaultWorkflow();

  const wf = await prisma.workflow.findUnique({ where: { id: instance.workflowId } });
  if (!wf) return null;
  return {
    id: wf.id,
    name: wf.name,
    description: wf.description,
    isActive: wf.isActive,
    states: wf.states as WfState[],
    transitions: wf.transitions as WfTransition[],
  };
}

/**
 * Return allowed target states for a given current status + role.
 * Mirrors the old getAllowedTransitions() but driven by the workflow.
 */
export function getAllowedTransitions(
  currentStatus: AssetStatus,
  role: string,
  workflow: WorkflowDef
): AssetStatus[] {
  const currentState = statusToState(currentStatus);

  // Legal Hold release is special — goes back to previousStatus
  if (currentState === "legal_hold") {
    const canRelease = workflow.transitions.some(
      (t) =>
        (t.from === "legal_hold" || t.from === "*") &&
        t.to === "*" &&
        t.roles.includes(role)
    );
    return canRelease ? (["__RESTORE__"] as unknown as AssetStatus[]) : [];
  }

  const allowed: AssetStatus[] = [];
  for (const t of workflow.transitions) {
    const fromMatch = t.from === currentState || t.from === "*";
    if (!fromMatch) continue;
    if (t.to === "*") continue; // wildcard "to" handled separately (legal hold release)
    if (!t.roles.includes(role)) continue;

    const toStatus = stateToStatus(t.to);
    if (!allowed.includes(toStatus)) allowed.push(toStatus);
  }
  return allowed;
}

/**
 * Validate whether a specific transition is allowed.
 * Returns the transition definition if valid, null otherwise.
 */
export function findTransition(
  fromStatus: AssetStatus,
  toStatus: AssetStatus,
  role: string,
  workflow: WorkflowDef
): WfTransition | null {
  const from = statusToState(fromStatus);
  const to = statusToState(toStatus);

  return (
    workflow.transitions.find((t) => {
      const fromMatch = t.from === from || t.from === "*";
      const toMatch = t.to === to || t.to === "*";
      return fromMatch && toMatch && t.roles.includes(role);
    }) ?? null
  );
}

// ── WorkflowInstance lifecycle ───────────────────────────────────────────────

type HistoryEntry = {
  fromState: string;
  toState: string;
  timestamp: string;
  performedById: string;
  notes?: string;
};

/** Create a WorkflowInstance when an asset is first created. */
export async function createWorkflowInstance(
  assetId: string,
  userId: string,
  workflowId: string
): Promise<void> {
  await prisma.workflowInstance.upsert({
    where: { assetId },
    update: {},
    create: {
      assetId,
      workflowId,
      currentState: "in_stock",
      history: [] as HistoryEntry[],
      startedById: userId,
    },
  });
}

/** Update the WorkflowInstance after a successful transition. */
export async function recordTransition(
  assetId: string,
  fromStatus: AssetStatus,
  toStatus: AssetStatus,
  userId: string,
  notes?: string
): Promise<void> {
  const instance = await prisma.workflowInstance.findUnique({ where: { assetId } });
  if (!instance) return;

  const entry: HistoryEntry = {
    fromState: statusToState(fromStatus),
    toState: statusToState(toStatus),
    timestamp: new Date().toISOString(),
    performedById: userId,
    notes,
  };

  const history = (instance.history as HistoryEntry[]) ?? [];

  await prisma.workflowInstance.update({
    where: { assetId },
    data: {
      currentState: statusToState(toStatus),
      history: [...history, entry],
    },
  });
}
