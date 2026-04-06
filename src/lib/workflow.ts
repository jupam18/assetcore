import { AssetStatus, UserRole } from "@prisma/client";

// Valid transitions: from → to[]
export const TRANSITIONS: Partial<Record<AssetStatus, AssetStatus[]>> = {
  IN_STOCK: ["DEPLOYED", "IN_MAINTENANCE", "LEGAL_HOLD", "RETIRED"],
  DEPLOYED: ["PENDING_RETURN", "IN_STOCK", "LEGAL_HOLD"],
  IN_MAINTENANCE: ["IN_STOCK", "LEGAL_HOLD"],
  PENDING_RETURN: ["IN_STOCK", "LEGAL_HOLD"],
  LEGAL_HOLD: [], // handled dynamically via previousStatus
  RETIRED: ["DISPOSED", "LEGAL_HOLD"],
  DISPOSED: [],
};

export const LEGAL_HOLD_ROLES: UserRole[] = ["GLOBAL_ADMIN"];

export function getAllowedTransitions(
  currentStatus: AssetStatus,
  role: UserRole
): AssetStatus[] {
  if (currentStatus === "LEGAL_HOLD") {
    // Only global admin can release legal hold
    return role === "GLOBAL_ADMIN" ? ["__RESTORE__" as unknown as AssetStatus] : [];
  }

  const base = TRANSITIONS[currentStatus] ?? [];
  // Non-admins can't place legal hold, retire, or dispose
  if (role !== "GLOBAL_ADMIN") {
    return base.filter(
      (s) => s !== "LEGAL_HOLD" && s !== "RETIRED" && s !== "DISPOSED"
    );
  }
  return base;
}

export const STATUS_LABELS: Record<AssetStatus, string> = {
  IN_STOCK: "In Stock",
  DEPLOYED: "Deployed",
  IN_MAINTENANCE: "In Maintenance",
  PENDING_RETURN: "Pending Return",
  LEGAL_HOLD: "Legal Hold",
  RETIRED: "Retired",
  DISPOSED: "Disposed",
};

export const STATUS_COLORS: Record<AssetStatus, string> = {
  IN_STOCK: "bg-muted text-muted-foreground",
  DEPLOYED: "bg-brand-100 text-brand-800",
  IN_MAINTENANCE: "bg-amber-50 text-amber-700 border border-amber-200/60",
  PENDING_RETURN: "bg-purple-50 text-purple-700 border border-purple-200/60",
  LEGAL_HOLD: "bg-red-50 text-red-700 border border-red-200/60",
  RETIRED: "bg-muted text-muted-foreground/70",
  DISPOSED: "bg-muted text-muted-foreground/50",
};

export const TRANSITION_LABELS: Partial<Record<string, string>> = {
  "IN_STOCK→DEPLOYED": "Deploy",
  "IN_STOCK→IN_MAINTENANCE": "Send to Maintenance",
  "IN_STOCK→LEGAL_HOLD": "Place Legal Hold",
  "IN_STOCK→RETIRED": "Retire",
  "DEPLOYED→PENDING_RETURN": "Request Return",
  "DEPLOYED→IN_STOCK": "Return",
  "DEPLOYED→LEGAL_HOLD": "Place Legal Hold",
  "IN_MAINTENANCE→IN_STOCK": "Return from Maintenance",
  "IN_MAINTENANCE→LEGAL_HOLD": "Place Legal Hold",
  "PENDING_RETURN→IN_STOCK": "Confirm Return",
  "PENDING_RETURN→LEGAL_HOLD": "Place Legal Hold",
  "LEGAL_HOLD→__RESTORE__": "Release Legal Hold",
  "RETIRED→DISPOSED": "Dispose",
  "RETIRED→LEGAL_HOLD": "Place Legal Hold",
};
