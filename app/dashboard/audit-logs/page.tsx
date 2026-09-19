import { prisma } from "@/lib/db";

export default async function AuditLogsPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { actor: true }
  });

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Audit Logs</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-2">Time</th>
              <th className="p-2">Actor</th>
              <th className="p-2">Action</th>
              <th className="p-2">Entity</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-2 whitespace-nowrap">{l.createdAt.toISOString()}</td>
                <td className="p-2">{l.actor?.name ?? l.actorType}</td>
                <td className="p-2">{l.action}</td>
                <td className="p-2">{l.entityType}#{l.entityId.slice(0, 8)}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td className="p-4 text-gray-400" colSpan={4}>No audit events yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
