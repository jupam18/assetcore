import { prisma } from "@/lib/prisma";

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
        <h1 className="text-2xl font-semibold text-gray-900">Global Audit Log</h1>
        <p className="text-sm text-gray-500 mt-1">{total.toLocaleString()} total entries</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Timestamp</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Entity</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Performed By</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  <span className="font-medium">{log.entityType}</span>
                  <span className="text-gray-400 ml-1 text-xs font-mono">
                    {log.entityId.slice(0, 8)}…
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {log.performedBy
                    ? `${log.performedBy.name} (${log.performedBy.email})`
                    : "System"}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{log.notes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Page {pageNum} of {pages}
          </span>
          <div className="flex gap-2">
            {pageNum > 1 && (
              <a
                href={`?page=${pageNum - 1}`}
                className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
              >
                Previous
              </a>
            )}
            {pageNum < pages && (
              <a
                href={`?page=${pageNum + 1}`}
                className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
              >
                Next
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
