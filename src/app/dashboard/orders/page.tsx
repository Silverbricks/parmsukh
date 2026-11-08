import Link from "next/link";
import { db } from "@/lib/db";
import { requirePatient } from "@/lib/auth";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { requestOrderAction } from "@/app/actions/patient";
import { fmtDate, fmtDateTime, inr, label } from "@/lib/format";

export default async function MyOrders() {
  const { session, patient } = await requirePatient();
  const [orders, payments] = await Promise.all([
    db.order.findMany({ where: { userId: session.uid }, include: { items: true, events: { orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "desc" } }),
    db.appointment.findMany({ where: { patientId: patient.id, status: { not: "CANCELLED" } }, orderBy: { date: "desc" }, take: 20 }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="My Orders & Payments" actions={<Link href="/store" className="btn-primary">Shop</Link>} />
      {!orders.length && <Empty>No orders yet.</Empty>}
      {orders.map((o) => (
        <div key={o.id} className="card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><div className="font-serif text-xl font-semibold">{o.number}</div><div className="text-xs text-charcoal-500">{fmtDateTime(o.createdAt)} · {label(o.paymentMethod)} · <Badge s={o.paymentStatus} /></div></div>
            <div className="flex items-center gap-2">
              <Badge s={o.status} />
              {["PENDING", "CONFIRMED"].includes(o.status) && <form action={requestOrderAction}><input type="hidden" name="id" value={o.id} /><input type="hidden" name="kind" value="cancel" /><button className="btn-ghost btn-sm text-red-700">Cancel order</button></form>}
              {o.status === "DELIVERED" && <form action={requestOrderAction}><input type="hidden" name="id" value={o.id} /><input type="hidden" name="kind" value="return" /><button className="btn-ghost btn-sm">Request return</button></form>}
            </div>
          </div>
          <table className="table mt-3"><tbody>
            {o.items.map((i) => <tr key={i.id}><td>{i.name}<div className="text-xs text-charcoal-500">Batch {i.batchNo}</div></td><td>× {i.quantity}</td><td className="text-right">{inr(i.price * i.quantity)}</td></tr>)}
            <tr><td colSpan={2} className="text-right text-charcoal-500">Delivery</td><td className="text-right">{o.shipping ? inr(o.shipping) : "Free"}</td></tr>
            {o.discount > 0 && <tr><td colSpan={2} className="text-right text-charcoal-500">Discount</td><td className="text-right">−{inr(o.discount)}</td></tr>}
            <tr><td colSpan={2} className="text-right font-semibold">Total (incl. GST {inr(o.tax)})</td><td className="text-right font-semibold">{inr(o.total)}</td></tr>
          </tbody></table>
          {o.trackingNo && <p className="mt-2 text-sm">Courier {o.courier} · Tracking {o.trackingNo}</p>}
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-charcoal-500">{o.events.map((e) => <span key={e.id}>{label(e.status)} {fmtDate(e.createdAt)} ›</span>)}</div>
        </div>
      ))}
      <section className="card">
        <h2 className="section-title">Consultation payments</h2>
        <table className="table mt-3">
          <thead><tr><th>Booking</th><th>Date</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead>
          <tbody>{payments.map((a) => <tr key={a.id}><td>{a.ref}</td><td>{fmtDate(a.date)}</td><td>{inr(a.fee - a.discount)}</td><td>{label(a.paymentMethod)}</td><td><Badge s={a.paymentStatus} /></td></tr>)}</tbody>
        </table>
      </section>
    </div>
  );
}
