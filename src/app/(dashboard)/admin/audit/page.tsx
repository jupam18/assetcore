import { prisma } from "@/lib/prisma";

const ACTION_STYLES: Record<string, string> = {
  CREATE:              "bg-emerald-50 text-emerald-700 border border-emerald-200/60",
  UPDATE:              "bg-blue-50 text-blue-700 border border-blue-200/60",
  STATUS_CHANGE:       "bg-purple-50 text-purple-700 border border-purple-200/60",
  ASSIGNMENT:          "bg-amber-50 text-amber-700 border border-amber-200/60",
  TRANSFER:            "bg-orange-50 text-orange-700 border border-orange-200/60",
  DELETE:              "bg-red-50 text-red-700 border border-red-200/60",
  WORKFLOW_TRANSITION: "bg-indigo-50 text-indigo-700 border border-indigo-200/60",
};

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page = "1" } = await searchParams;
  const pageNum = Math.max(1, Number(page));
  const limit = 50;
  const skip = (pageNum - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        performedBy: { select: { name: true, email: true } },
      },
    }),
    prisma.auditLog.count(),
  ]);

  const pages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Global Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-1">{total.toLocaleString()} total entries</p>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30">Timestamp</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30">Action</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30">Entity</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30">Performed By</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30">Notes</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <tr key={log.id} className={`hover:bg-brand-50/30 transition-colors ${i !== logs.length - 1 ? "border-b border-border/50" : ""}`}>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap font-mono">
                  {log.createdAt.toISOString().slice(0, 10)} {log.createdAt.toISOString().slice(11, 16)}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold ${ACTION_STYLES[log.action] ?? "bg-muted text-muted-foreground"}`}>
                    {log.action.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-foreground">
                  <span className="font-medium">{log.entityType}</span>
                  <span className="text-muted-foreground ml-1.5 text-xs font-mono">{log.entityId.slice(0, 8)}</span>
                </td>
                <td className="px-4 py-3 text-foreground">
                  {log.performedBy ? (
                    <span>{log.performedBy.name} <span className="text-muted-foreground text-xs">({log.performedBy.email})</span></span>
                  ) : (
                    <span className="text-muted-foreground">System</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs max-w-xs truncate">{log.notes ?? "\u2014"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {pageNum} of {pages}
          </span>
          <div className="flex gap-1.5">
            {pageNum > 1 && (
              <a href={`?page=${pageNum - 1}`}
                className="px-3.5 py-1.5 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-secondary transition-colors">
                Previous
              </a>
            )}
            {pageNum < pages && (
              <a href={`?page=${pageNum + 1}`}
                className="px-3.5 py-1.5 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-secondary transition-colors">
                Next
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
