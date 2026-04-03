import { AssetStatus } from "@prisma/client";
import Link from "next/link";
import { STATUS_COLORS, STATUS_LABELS } from "./workflow";

export type AssetRow = {
  id: string;
  serialNumber: string;
  assetTag: string | null;
  deviceName: string | null;
  status: AssetStatus;
  condition: string;
  manufacturer: string;
  model: string;
  processor: string | null;
  ram: string | null;
  storage: string | null;
  os: string | null;
  purchaseDate: string | null;
  purchasePrice: number | null;
  warrantyExpiry: string | null;
  createdAt: string;
  type: { name: string };
  location: { name: string; parent: { name: string } | null } | null;
  assignments: { assignedTo: { name: string } }[];
};

const CONDITION_LABELS: Record<string, string> = {
  NEW: "New",
  GOOD: "Good",
  FAIR: "Fair",
  DAMAGED: "Damaged",
  FOR_PARTS: "For Parts",
};

export type ColumnDef = {
  key: string;
  label: string;
  render: (asset: AssetRow) => React.ReactNode;
  className?: string;
};

export const ALL_COLUMNS: ColumnDef[] = [
  {
    key: "serialNumber",
    label: "Serial Number",
    className: "whitespace-nowrap",
    render: (a) => (
      <Link href={`/assets/${a.id}`} className="font-mono text-brand-800 hover:text-brand-600 hover:underline font-medium">
        {a.serialNumber}
      </Link>
    ),
  },
  {
    key: "assetTag",
    label: "Asset Tag",
    render: (a) => <span className="font-mono text-xs text-muted-foreground/70">{a.assetTag ?? "—"}</span>,
  },
  {
    key: "deviceModel",
    label: "Device / Model",
    render: (a) => (
      <div>
        <div className="font-medium text-foreground">{a.deviceName ?? `${a.manufacturer} ${a.model}`}</div>
        {a.deviceName && <div className="text-xs text-muted-foreground/50 mt-0.5">{a.manufacturer} {a.model}</div>}
      </div>
    ),
  },
  {
    key: "type",
    label: "Type",
    render: (a) => <span className="text-muted-foreground">{a.type.name}</span>,
  },
  {
    key: "status",
    label: "Status",
    render: (a) => (
      <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[a.status]}`}>
        {STATUS_LABELS[a.status]}
      </span>
    ),
  },
  {
    key: "condition",
    label: "Condition",
    render: (a) => <span className="text-xs text-muted-foreground">{CONDITION_LABELS[a.condition] ?? a.condition}</span>,
  },
  {
    key: "manufacturer",
    label: "Manufacturer",
    render: (a) => <span className="text-muted-foreground">{a.manufacturer}</span>,
  },
  {
    key: "model",
    label: "Model",
    render: (a) => <span className="text-muted-foreground">{a.model}</span>,
  },
  {
    key: "location",
    label: "Location",
    render: (a) => (
      <span className="text-xs text-muted-foreground">
        {a.location
          ? a.location.parent
            ? `${a.location.parent.name} / ${a.location.name}`
            : a.location.name
          : "—"}
      </span>
    ),
  },
  {
    key: "assignedTo",
    label: "Assigned To",
    render: (a) => <span className="text-muted-foreground">{a.assignments[0]?.assignedTo.name ?? "—"}</span>,
  },
  {
    key: "processor",
    label: "Processor",
    render: (a) => <span className="text-xs text-muted-foreground">{a.processor ?? "—"}</span>,
  },
  {
    key: "ram",
    label: "RAM",
    render: (a) => <span className="text-xs text-muted-foreground">{a.ram ?? "—"}</span>,
  },
  {
    key: "storage",
    label: "Storage",
    render: (a) => <span className="text-xs text-muted-foreground">{a.storage ?? "—"}</span>,
  },
  {
    key: "os",
    label: "OS",
    render: (a) => <span className="text-xs text-muted-foreground">{a.os ?? "—"}</span>,
  },
  {
    key: "purchaseDate",
    label: "Purchase Date",
    render: (a) => (
      <span className="text-xs text-muted-foreground">
        {a.purchaseDate ? a.purchaseDate.slice(0, 10) : "—"}
      </span>
    ),
  },
  {
    key: "purchasePrice",
    label: "Purchase Price",
    render: (a) => (
      <span className="text-xs text-muted-foreground">
        {a.purchasePrice != null ? `$${a.purchasePrice.toLocaleString("en-US")}` : "—"}
      </span>
    ),
  },
  {
    key: "warrantyExpiry",
    label: "Warranty Expiry",
    render: (a) => (
      <span className="text-xs text-muted-foreground">
        {a.warrantyExpiry ? a.warrantyExpiry.slice(0, 10) : "—"}
      </span>
    ),
  },
  {
    key: "createdAt",
    label: "Created",
    render: (a) => (
      <span className="text-xs text-muted-foreground/50">{a.createdAt.slice(0, 10)}</span>
    ),
  },
];

export const COLUMN_MAP = Object.fromEntries(ALL_COLUMNS.map((c) => [c.key, c]));

export const DEFAULT_COLUMNS = [
  "serialNumber",
  "deviceModel",
  "type",
  "status",
  "assignedTo",
  "location",
  "condition",
  "createdAt",
];
