import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { fmtDateTime, inr, label } from "@/lib/format";
import { ORDER_STATUSES } from "@/lib/constants";

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const sp = await searchParams;
  await requirePermission("orders:manage");
  const where = {
    ...(sp.status === "open" ? { status: { in: ["PENDING", "CONFIRMED", "PROCESSING"] } } : sp.status === "refunds" ? { paymentStatus: "REFUND_REQUESTED" } : sp.status ? { status: sp.status } : {}),
    ...(sp.q ? { OR: [{ number: { contains: sp.q } }, { mobile: { contains: sp.q } }, { name: { contains: sp.q } }] } : {}),
  };
  const [orders, counts] = await Promise.all([
    db.order.findMany({ where, include: { _count: { select: { items: true } } }, orderBy: { createdAt: "desc" }, take: 200 }),
    db.order.groupBy({ by: ["status"], _count: true }),
  ]);
  const tabs: [string, string][] = [["", "All"], ["open", "Open"], ...ORDER_STATUSES.map((s) => [s, label(s)] as [string, string]), ["refunds", "Refund requests"]];
  return (
    <div className="space-y-6">
      <PageHeader title="Orders & payments" />
      <div className="flex flex-wrap gap-1">
        {tabs.map(([k, t]) => (
          <Link key={k} href={`/admin/orders${k ? `?status=${k}` : ""}`} className={(sp.status ?? "") === k ? "btn-primary btn-sm" : "btn-outline btn-sm"}>
            {t}{counts.find((c) => c.status === k) ? ` (${counts.find((c) => c.status === k)!._count})` : ""}
          </Link>
        ))}
      </div>
      <form className="card flex gap-2"><input type="hidden" name="status" value={sp.status ?? ""} /><input className="input max-w-md" name="q" defaultValue={sp.q} placeholder="Order no., name or mobile" /><button className="btn-primary">Search</button></form>
      <div className="card overflow-x-auto">
        {orders.length ? (
          <table className="table">
            <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th /></tr></thead>
            <tbody>{orders.map((o) => (
              <tr key={o.id}>
                <td className="font-mono text-xs">{o.number}</td><td>{fmtDateTime(o.createdAt)}</td>
                <td>{o.name}<div className="text-xs text-charcoal-500">{o.mobile} · {o.isGuest ? "Guest" : "Patient"}{o.prescriptionId ? " · ℞" : ""}</div></td>
                <td>{o._count.items}</td><td>{inr(o.total)}</td>
                <td className="text-xs">{label(o.paymentMethod)}<br /><Badge s={o.paymentStatus} /></td>
                <td><Badge s={o.status} /></td>
                <td><Link href={`/admin/orders/${o.id}`} className="text-forest-700 underline">Manage</Link></td>
              </tr>
            ))}</tbody>
          </table>
        ) : <Empty>No orders.</Empty>}
      </div>
    </div>
  );
}
