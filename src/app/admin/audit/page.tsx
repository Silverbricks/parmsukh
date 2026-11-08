import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { fmtDateTime, label } from "@/lib/format";

export default async function Audit({ searchParams }: { searchParams: Promise<{ action?: string; entityId?: string }> }) {
  const sp = await searchParams;
  await requirePermission("audit:view");
  const [logs, actions] = await Promise.all([
    db.auditLog.findMany({ where: { ...(sp.action ? { action: sp.action } : {}), ...(sp.entityId ? { entityId: sp.entityId } : {}) }, include: { user: true }, orderBy: { createdAt: "desc" }, take: 300 }),
    db.auditLog.groupBy({ by: ["action"], _count: true, orderBy: { action: "asc" } }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Audit logs" sub="Every login, clinical-record access, change and order is recorded." />
      <form className="card flex flex-wrap gap-2">
        <select className="input max-w-xs" name="action" defaultValue={sp.action ?? ""}><option value="">All actions</option>{actions.map((a) => <option key={a.action} value={a.action}>{label(a.action)} ({a._count})</option>)}</select>
        <input className="input max-w-xs" name="entityId" defaultValue={sp.entityId} placeholder="Record ID" />
        <button className="btn-primary">Filter</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="table text-xs">
          <thead><tr><th>When</th><th>User</th><th>Role</th><th>Action</th><th>Record</th><th>Details</th></tr></thead>
          <tbody>{logs.map((l) => (
            <tr key={l.id}><td className="whitespace-nowrap">{fmtDateTime(l.createdAt)}</td><td>{l.user?.name ?? "Guest"}</td><td>{label(l.role)}</td>
              <td className={l.action.includes("CLINICAL") || l.action.includes("DENIED") ? "font-semibold text-gold-700" : ""}>{label(l.action)}</td>
              <td className="font-mono">{l.entity}{l.entityId ? `:${l.entityId.slice(-8)}` : ""}</td><td className="max-w-xs truncate">{l.meta}</td></tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
