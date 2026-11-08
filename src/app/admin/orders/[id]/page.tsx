import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { ActionForm } from "@/components/action-form";
import { Area, Badge, Field, PageHeader, Select } from "@/components/ui";
import { PrintButton } from "@/components/print-button";
import { markRefunded, updateOrder } from "@/app/actions/admin";
import { CLINIC, ORDER_STATUSES } from "@/lib/constants";
import { fmtDateTime, inr, label } from "@/lib/format";

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("orders:manage");
  const o = await db.order.findUnique({ where: { id }, include: { items: true, events: { orderBy: { createdAt: "asc" } }, prescription: true } });
  if (!o) notFound();
  const gstin = (await db.clinicSetting.findUnique({ where: { key: "gstin" } }))?.value;
  return (
    <div className="space-y-6">
      <PageHeader title={`Order ${o.number}`} sub={`${fmtDateTime(o.createdAt)} · ${o.isGuest ? "Guest checkout" : "Registered patient"}`} actions={<PrintButton label="Print invoice" />} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="card">
          <div className="mb-4 hidden print:block">
            <div className="font-serif text-2xl font-bold text-forest-800">{CLINIC.brand}</div>
            <div className="text-xs">{CLINIC.name} · {CLINIC.address}{gstin ? ` · GSTIN ${gstin}` : ""}</div>
            <div className="mt-2 text-sm font-semibold">Tax invoice – {o.number}</div>
          </div>
          <div className="text-sm"><b>{o.name}</b> · {o.mobile}{o.email ? ` · ${o.email}` : ""}<br />{o.line1}{o.line2 ? `, ${o.line2}` : ""}, {o.city}, {o.state} {o.pinCode}</div>
          {o.prescription && <p className="mt-2 text-xs text-forest-700">Supplied against prescription {o.prescription.number}</p>}
          <table className="table mt-4">
            <thead><tr><th>Item</th><th>Batch</th><th>Qty</th><th>MRP</th><th>Price</th><th className="text-right">Amount</th></tr></thead>
            <tbody>
              {o.items.map((i) => <tr key={i.id}><td>{i.name}</td><td className="font-mono text-xs">{i.batchNo}</td><td>{i.quantity}</td><td>{inr(i.mrp)}</td><td>{inr(i.price)}</td><td className="text-right">{inr(i.price * i.quantity)}</td></tr>)}
              <tr><td colSpan={5} className="text-right">Subtotal</td><td className="text-right">{inr(o.subtotal)}</td></tr>
              {o.discount > 0 && <tr><td colSpan={5} className="text-right">Discount {o.couponCode}</td><td className="text-right">−{inr(o.discount)}</td></tr>}
              <tr><td colSpan={5} className="text-right">Shipping</td><td className="text-right">{inr(o.shipping)}</td></tr>
              <tr><td colSpan={5} className="text-right text-xs text-charcoal-500">GST included</td><td className="text-right text-xs">{inr(o.tax)}</td></tr>
              <tr><td colSpan={5} className="text-right font-semibold">Total</td><td className="text-right font-semibold">{inr(o.total)}</td></tr>
            </tbody>
          </table>
          <h3 className="mt-6 font-semibold">History</h3>
          <ol className="mt-2 space-y-1 border-l-2 border-forest-200 pl-4 text-sm">
            {o.events.map((e) => <li key={e.id}><b>{label(e.status)}</b> · {fmtDateTime(e.createdAt)}{e.note ? ` – ${e.note}` : ""}</li>)}
          </ol>
        </div>
        <div className="no-print space-y-4">
          <div className="card text-sm">
            <div className="flex justify-between"><span>Status</span><Badge s={o.status} /></div>
            <div className="mt-2 flex justify-between"><span>Payment</span><span>{label(o.paymentMethod)} <Badge s={o.paymentStatus} /></span></div>
            {o.paymentStatus === "REFUND_REQUESTED" && <form action={markRefunded} className="mt-3"><input type="hidden" name="id" value={o.id} /><button className="btn-outline w-full">Mark refund processed</button></form>}
          </div>
          <div className="card">
            <h2 className="section-title">Update order</h2>
            <ActionForm action={updateOrder} submit="Update" className="mt-3 space-y-3">
              <input type="hidden" name="id" value={o.id} />
              <Select label="Status" name="status" required options={[...ORDER_STATUSES]} defaultValue={o.status} />
              <Field label="Courier" name="courier" defaultValue={o.courier} />
              <Field label="Tracking number" name="trackingNo" defaultValue={o.trackingNo} />
              <Area label="Note" name="note" rows={2} />
              <p className="text-xs text-charcoal-500">Cancelling restocks the original batches. Returned goods are not restocked automatically.</p>
            </ActionForm>
          </div>
        </div>
      </div>
    </div>
  );
}
