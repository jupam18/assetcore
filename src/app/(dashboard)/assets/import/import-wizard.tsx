"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, ChevronRight, Download, Upload, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";

// ── CSV helpers ───────────────────────────────────────────────────────────────

const TEMPLATE_HEADERS = [
  "serialNumber", "assetTag", "deviceName", "assetType",
  "manufacturer", "model", "condition", "location",
  "processor", "ram", "storage", "os",
  "purchaseDate", "purchasePrice", "warrantyExpiry",
];

const REQUIRED_HEADERS = ["serialNumber", "assetType", "manufacturer", "model", "condition", "location"];

const CONDITIONS = ["NEW", "GOOD", "FAIR", "DAMAGED", "FOR_PARTS"];

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes;
      } else if (line[i] === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += line[i];
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]).map((h) => h.toLowerCase().trim());
  const rows = lines.slice(1).map((line) => {
    const values = parseRow(line);
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });

  return { headers, rows };
}

function downloadTemplate(assetTypes: string[], locations: string[]) {
  const exampleRows = [
    ["SN-NB-UY-001", "NB-001", "John's ThinkPad", assetTypes[0] ?? "Notebook", "Lenovo", "ThinkPad T14 Gen 4", "GOOD", locations[0] ?? "Montevideo HQ", "Intel Core i7-1365U", "16 GB DDR5", "512 GB NVMe", "Windows 11 Pro", "2024-01-15", "1200", "2027-01-15"],
    ["SN-MN-AR-001", "", "", assetTypes[1] ?? "Monitor", "Dell", "U2723QE", "NEW", locations[1] ?? "Buenos Aires Office", "", "", "", "", "", "450", "2027-03-01"],
  ];
  const csv = [TEMPLATE_HEADERS.join(","), ...exampleRows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "assetcore_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ── Row validation (client-side preview) ─────────────────────────────────────

type ParsedRow = Record<string, string>;

type ValidatedRow = {
  data: ParsedRow;
  errors: string[];
  rowIndex: number;
};

function validateRows(rows: ParsedRow[], assetTypes: string[], locations: string[]): ValidatedRow[] {
  const typeSet = new Set(assetTypes.map((t) => t.toLowerCase()));
  const locSet = new Set(locations.map((l) => l.toLowerCase()));
  const seenSerials = new Set<string>();

  return rows.map((row, i) => {
    const errors: string[] = [];
    const sn = (row.serialnumber ?? "").trim().toUpperCase();

    if (!sn) errors.push("Serial number is required");
    else if (seenSerials.has(sn)) errors.push("Duplicate serial number in this file");
    else seenSerials.add(sn);

    if (!row.assettype?.trim()) errors.push("Asset type is required");
    else if (!typeSet.has(row.assettype.toLowerCase())) errors.push(`Unknown asset type: "${row.assettype}"`);

    if (!row.manufacturer?.trim()) errors.push("Manufacturer is required");
    if (!row.model?.trim()) errors.push("Model is required");

    const cond = (row.condition ?? "").trim().toUpperCase();
    if (!cond) errors.push("Condition is required");
    else if (!CONDITIONS.includes(cond)) errors.push(`Invalid condition: "${row.condition}" (use NEW, GOOD, FAIR, DAMAGED, FOR_PARTS)`);

    if (!row.location?.trim()) errors.push("Location is required");
    else if (!locSet.has(row.location.toLowerCase())) errors.push(`Unknown location: "${row.location}"`);

    if (row.purchaseprice && isNaN(Number(row.purchaseprice))) errors.push("Purchase price must be a number");
    if (row.purchasedate && isNaN(Date.parse(row.purchasedate))) errors.push("Invalid purchase date (use YYYY-MM-DD)");
    if (row.warrantyexpiry && isNaN(Date.parse(row.warrantyexpiry))) errors.push("Invalid warranty expiry (use YYYY-MM-DD)");

    return { data: row, errors, rowIndex: i + 2 }; // +2: 1-based + header row
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = { assetTypes: string[]; locations: string[] };
type Step = "upload" | "preview" | "results";

type ImportResult = {
  imported: number;
  failed: number;
  results: { row: number; serialNumber: string; status: "imported" | "failed"; error?: string }[];
};

export function ImportWizard({ assetTypes, locations }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [validated, setValidated] = useState<ValidatedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const validRows = validated.filter((r) => r.errors.length === 0);
  const invalidRows = validated.filter((r) => r.errors.length > 0);

  function handleFile(file: File) {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, rows } = parseCSV(text);

      // Check required headers exist
      const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
      if (missing.length > 0) {
        toast.error(`CSV is missing required columns: ${missing.join(", ")}`);
        return;
      }

      const result = validateRows(rows, assetTypes, locations);
      setValidated(result);
      setStep("preview");
    };
    reader.readAsText(file);
  }

  async function runImport() {
    setImporting(true);
    const rows = validRows.map((r) => ({
      serialNumber: r.data.serialnumber?.trim().toUpperCase(),
      assetTag: r.data.assettag || null,
      deviceName: r.data.devicename || null,
      assetType: r.data.assettype,
      manufacturer: r.data.manufacturer,
      model: r.data.model,
      condition: r.data.condition?.toUpperCase(),
      location: r.data.location,
      processor: r.data.processor || null,
      ram: r.data.ram || null,
      storage: r.data.storage || null,
      os: r.data.os || null,
      purchaseDate: r.data.purchasedate || null,
      purchasePrice: r.data.purchaseprice || null,
      warrantyExpiry: r.data.warrantyexpiry || null,
    }));

    const res = await fetch("/api/assets/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
    const data = await res.json();
    setImporting(false);

    if (data.success) {
      setResults(data.data);
      setStep("results");
    } else {
      toast.error(data.error ?? "Import failed.");
    }
  }

  // ── Step: Upload ────────────────────────────────────────────────────────────

  if (step === "upload") {
    return (
      <div className="space-y-6">
        {/* Template download */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-start gap-4">
          <Download className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">Download the CSV template first</p>
            <p className="text-xs text-blue-700 mt-0.5 mb-3">
              Fill in the template with your asset data. Asset types must match exactly:{" "}
              <strong>{assetTypes.join(", ")}</strong>. Locations must match exactly:{" "}
              <strong>{locations.join(", ")}</strong>.
            </p>
            <Button size="sm" variant="outline" onClick={() => downloadTemplate(assetTypes, locations)}>
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download Template
            </Button>
          </div>
        </div>

        {/* Upload area */}
        <div
          className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-400 transition-colors cursor-pointer"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file?.name.endsWith(".csv")) handleFile(file);
            else toast.error("Please upload a .csv file.");
          }}
        >
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700">Drop a CSV file here, or click to browse</p>
          <p className="text-xs text-gray-400 mt-1">Max 500 rows per import</p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>

        {/* Required columns reference */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">Column reference</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {TEMPLATE_HEADERS.map((h) => (
              <div key={h} className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${REQUIRED_HEADERS.includes(h) ? "bg-red-500" : "bg-gray-300"}`} />
                <code className="text-gray-700">{h}</code>
                {REQUIRED_HEADERS.includes(h) && <span className="text-red-500">*</span>}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3"><span className="text-red-500">*</span> Required</p>
        </div>
      </div>
    );
  }

  // ── Step: Preview ───────────────────────────────────────────────────────────

  if (step === "preview") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-500">{fileName}</span>
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700">
              <CheckCircle2 className="w-3 h-3" />
              {validRows.length} valid
            </span>
            {invalidRows.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700">
                <X className="w-3 h-3" />
                {invalidRows.length} with errors
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { setStep("upload"); setValidated([]); }}>
              Change file
            </Button>
            <Button
              size="sm"
              disabled={validRows.length === 0 || importing}
              onClick={runImport}
            >
              {importing ? "Importing…" : `Import ${validRows.length} asset${validRows.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>

        {invalidRows.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            <strong>{invalidRows.length} row{invalidRows.length !== 1 ? "s" : ""} will be skipped</strong> due to validation errors.
            Only the {validRows.length} valid rows will be imported.
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-10">#</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Status</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Serial Number</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Type</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Manufacturer / Model</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Condition</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Location</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Errors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {validated.map((row) => (
                <tr key={row.rowIndex} className={row.errors.length > 0 ? "bg-red-50" : ""}>
                  <td className="px-3 py-2 text-gray-400">{row.rowIndex}</td>
                  <td className="px-3 py-2">
                    {row.errors.length === 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono font-medium text-gray-900">
                    {row.data.serialnumber || <span className="text-red-400 italic">missing</span>}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{row.data.assettype || "—"}</td>
                  <td className="px-3 py-2 text-gray-600">
                    {row.data.manufacturer} {row.data.model}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{row.data.condition || "—"}</td>
                  <td className="px-3 py-2 text-gray-600">{row.data.location || "—"}</td>
                  <td className="px-3 py-2">
                    {row.errors.length > 0 && (
                      <ul className="text-red-600 space-y-0.5">
                        {row.errors.map((e, i) => <li key={i}>• {e}</li>)}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Step: Results ───────────────────────────────────────────────────────────

  const failed = results?.results.filter((r) => r.status === "failed") ?? [];

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <div className="flex-1 bg-green-50 border border-green-200 rounded-xl p-5 flex items-center gap-4">
          <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
          <div>
            <p className="text-2xl font-bold text-green-700">{results?.imported}</p>
            <p className="text-sm text-green-600">Assets imported</p>
          </div>
        </div>
        {(results?.failed ?? 0) > 0 && (
          <div className="flex-1 bg-red-50 border border-red-200 rounded-xl p-5 flex items-center gap-4">
            <X className="w-8 h-8 text-red-400 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-red-600">{results?.failed}</p>
              <p className="text-sm text-red-500">Rows failed</p>
            </div>
          </div>
        )}
      </div>

      {failed.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
            Failed rows
          </div>
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Row</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Serial Number</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {failed.map((r) => (
                <tr key={r.row}>
                  <td className="px-4 py-2 text-gray-400">{r.row}</td>
                  <td className="px-4 py-2 font-mono text-gray-700">{r.serialNumber}</td>
                  <td className="px-4 py-2 text-red-600">{r.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex gap-3">
        <Link href="/assets" className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80">
          View Assets
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
        <Button variant="outline" size="sm" onClick={() => { setStep("upload"); setValidated([]); setResults(null); }}>
          Import another file
        </Button>
      </div>
    </div>
  );
}
