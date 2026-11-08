import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { inr, label } from "@/lib/format";
import { SYSTEMS } from "@/lib/constants";

function Bars({ rows }: { rows: { k: string; v: number; display?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.v));
  return (
    <ul className="mt-3 space-y-2 text-sm">
      {rows.map((r) => (
        <li key={r.k}>
          <div className="flex justify-between text-xs"><span>{r.k}</span><span className="font-medium">{r.display ?? r.v}</span></div>
          <div className="mt-0.5 h-2 rounded bg-ivory-200"><div className="h-2 rounded bg-forest-600" style={{ width: `${(r.v / max) * 100}%` }} /></div>
        </li>
      ))}
      {!rows.length && <li className="text-charcoal-500">No data yet.</li>}
    </ul>
  );
}

export default async function Reports() {
  await requirePermission("reports:view");
  const since = new Date(); since.setMonth(since.getMonth() - 5); since.setDate(1);
  const [patients, consults, orders, items, appts, doctors, outstanding, returning] = await Promise.all([
    db.patient.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    db.consultation.findMany({ where: { createdAt: { gte: since } }, select: { system: true, doctorId: true, status: true } }),
    db.order.findMany({ where: { createdAt: { gte: since }, status: { notIn: ["CANCELLED", "RETURNED"] } }, select: { total: true, createdAt: true } }),
    db.orderItem.groupBy({ by: ["name"], _sum: { quantity: true }, where: { order: { status: { notIn: ["CANCELLED", "RETURNED"] } } }, orderBy: { _sum: { quantity: "desc" } }, take: 8 }),
    db.appointment.groupBy({ by: ["status"], _count: true }),
    db.doctor.findMany({ include: { user: true } }),
    db.appointment.aggregate({ _sum: { fee: true, discount: true }, _count: true, where: { paymentStatus: "PENDING", status: "COMPLETED" } }),
    db.consultation.groupBy({ by: ["patientId"], _count: true }),
  ]);
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); months.push(d.toISOString().slice(0, 7)); }
  const byMonth = <T,>(arr: T[], at: (t: T) => Date, val: (t: T) => number = () => 1) => months.map((m) => ({ k: m, v: arr.filter((x) => at(x).toISOString().slice(0, 7) === m).reduce((s, x) => s + val(x), 0) }));
  const ret = returning.filter((r) => r._count > 1).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & analytics" sub="Last 6 months. Aggregated data only – no clinical content." />
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card"><h2 className="section-title">Patient registrations</h2><Bars rows={byMonth(patients, (p) => p.createdAt)} /></section>
        <section className="card"><h2 className="section-title">Store revenue</h2><Bars rows={byMonth(orders, (o) => o.createdAt, (o) => o.total).map((r) => ({ ...r, display: inr(r.v) }))} /></section>
        <section className="card"><h2 className="section-title">Consultations by therapy</h2><Bars rows={Object.entries(SYSTEMS).map(([k, v]) => ({ k: v, v: consults.filter((c) => c.system === k).length }))} /></section>
        <section className="card"><h2 className="section-title">Doctor performance</h2><Bars rows={doctors.map((d) => ({ k: d.user.name, v: consults.filter((c) => c.doctorId === d.id && c.status === "COMPLETED").length }))} /></section>
        <section className="card"><h2 className="section-title">Appointment outcomes</h2><Bars rows={appts.map((a) => ({ k: label(a.status), v: a._count }))} /></section>
        <section className="card"><h2 className="section-title">Top-selling products</h2><Bars rows={items.map((i) => ({ k: i.name, v: i._sum.quantity ?? 0 }))} /></section>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card"><div className="text-xs uppercase text-charcoal-500">Outstanding consultation payments</div><div className="font-serif text-3xl text-red-700">{inr((outstanding._sum.fee ?? 0) - (outstanding._sum.discount ?? 0))}</div><div className="text-xs">{outstanding._count} consultations</div></div>
        <div className="card"><div className="text-xs uppercase text-charcoal-500">Patient retention</div><div className="font-serif text-3xl text-forest-700">{returning.length ? Math.round((ret / returning.length) * 100) : 0}%</div><div className="text-xs">{ret} of {returning.length} patients returned for another consultation</div></div>
        <div className="card"><div className="text-xs uppercase text-charcoal-500">Orders (6 months)</div><div className="font-serif text-3xl text-forest-700">{orders.length}</div></div>
      </div>
    </div>
  );
}
