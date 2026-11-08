import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { Badge, PageHeader, Stat } from "@/components/ui";
import { addDays, fmtDate, inr, istNow } from "@/lib/format";

export default async function AdminDashboard() {
  const s = await requirePermission("admin:access");
  const today = istNow().date;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const soon = addDays(today, 60);

  const [patients, newPatients, doctors, todayAppts, upcoming, requested, completed, cancelled, followUps, activeConsults] = await Promise.all([
    db.patient.count(), db.patient.count({ where: { createdAt: { gte: monthStart } } }), db.doctor.count({ where: { active: true } }),
    db.appointment.count({ where: { date: today, status: { in: ["CONFIRMED", "REQUESTED"] } } }),
    db.appointment.count({ where: { date: { gt: today }, status: { in: ["CONFIRMED", "REQUESTED"] } } }),
    db.appointment.count({ where: { status: "REQUESTED" } }),
    db.consultation.count({ where: { status: "COMPLETED" } }),
    db.appointment.count({ where: { status: "CANCELLED", updatedAt: { gte: monthStart } } }),
    db.followUp.count({ where: { status: "DUE", dueDate: { lte: addDays(today, 7) } } }),
    db.consultation.count({ where: { status: "IN_PROGRESS" } }),
  ]);
  const showStore = can(s.role, "orders:manage") || can(s.role, "products:manage");
  const [orderAgg, pendingOrders, apptRevenue, batches, recentOrders] = showStore ? await Promise.all([
    db.order.aggregate({ _sum: { total: true }, _count: true, where: { status: { notIn: ["CANCELLED", "RETURNED"] }, createdAt: { gte: monthStart } } }),
    db.order.count({ where: { status: { in: ["PENDING", "CONFIRMED", "PROCESSING"] } } }),
    db.appointment.aggregate({ _sum: { fee: true, discount: true }, where: { paymentStatus: "PAID", updatedAt: { gte: monthStart } } }),
    db.productBatch.findMany({ include: { product: true } }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
  ]) : [null, 0, null, [], []];

  const stockByProduct = new Map<string, { name: string; qty: number; id: string }>();
  for (const b of batches) {
    if (b.expiryDate <= today) continue;
    const e = stockByProduct.get(b.productId) ?? { name: b.product.name, qty: 0, id: b.productId };
    e.qty += b.quantity; stockByProduct.set(b.productId, e);
  }
  const lowStock = [...stockByProduct.values()].filter((x) => x.qty <= 10);
  const expiring = batches.filter((b) => b.quantity > 0 && b.expiryDate <= soon).sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

  return (
    <div className="space-y-6">
      <PageHeader title="Clinic dashboard" sub={fmtDate(today)} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Registered patients" value={patients} href="/admin/patients" />
        <Stat label="New patients this month" value={newPatients} />
        <Stat label="Active doctors" value={doctors} href={can(s.role, "doctors:manage") ? "/admin/doctors" : undefined} />
        <Stat label="Today's appointments" value={todayAppts} href="/admin/appointments" />
        <Stat label="Upcoming appointments" value={upcoming} href="/admin/appointments" />
        <Stat label="Pending requests" value={requested} tone="gold" href="/admin/appointments?status=REQUESTED" />
        <Stat label="Active consultations" value={activeConsults} />
        <Stat label="Completed consultations" value={completed} />
        <Stat label="Follow-ups due (7d)" value={followUps} tone="gold" />
        <Stat label="Cancelled this month" value={cancelled} tone={cancelled ? "red" : "forest"} />
      </div>

      {showStore && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Store sales this month" value={inr(orderAgg?._sum.total ?? 0)} href="/admin/orders" />
            <Stat label="Orders this month" value={orderAgg?._count ?? 0} />
            <Stat label="Pending orders" value={pendingOrders} tone="gold" href="/admin/orders?status=open" />
            <Stat label="Consultation revenue (paid)" value={inr((apptRevenue?._sum.fee ?? 0) - (apptRevenue?._sum.discount ?? 0))} />
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <section className="card">
              <h2 className="section-title">Low-stock alerts</h2>
              <ul className="mt-3 space-y-1 text-sm">
                {lowStock.map((p) => <li key={p.id} className="flex justify-between"><Link href={`/admin/products/${p.id}`} className="hover:underline">{p.name}</Link><Badge s={p.qty === 0 ? "NO_SHOW" : "PENDING"} text={`${p.qty} left`} /></li>)}
                {!lowStock.length && <li className="text-charcoal-500">All stock levels healthy.</li>}
              </ul>
            </section>
            <section className="card">
              <h2 className="section-title">Expiring within 60 days</h2>
              <ul className="mt-3 space-y-1 text-sm">
                {expiring.map((b) => <li key={b.id} className="flex justify-between"><span>{b.product.name} · {b.batchNo}</span><span className={b.expiryDate <= today ? "text-red-700" : "text-gold-700"}>{fmtDate(b.expiryDate)} ({b.quantity})</span></li>)}
                {!expiring.length && <li className="text-charcoal-500">No batches expiring soon.</li>}
              </ul>
            </section>
            <section className="card">
              <h2 className="section-title">Recent orders</h2>
              <ul className="mt-3 space-y-1 text-sm">
                {recentOrders.map((o) => <li key={o.id} className="flex justify-between"><Link href={`/admin/orders/${o.id}`} className="hover:underline">{o.number} · {inr(o.total)}</Link><Badge s={o.status} /></li>)}
                {!recentOrders.length && <li className="text-charcoal-500">No orders yet.</li>}
              </ul>
            </section>
          </div>
        </>
      )}
      <p className="text-xs text-charcoal-500">Clinical notes are not visible in the admin portal. Access to clinical records is restricted to treating practitioners.</p>
    </div>
  );
}
