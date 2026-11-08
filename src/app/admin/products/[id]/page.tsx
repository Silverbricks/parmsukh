import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { ActionForm } from "@/components/action-form";
import { Badge, Field, PageHeader, Select } from "@/components/ui";
import { ProductForm } from "@/components/product-form";
import { addBatch, adjustStock } from "@/app/actions/admin";
import { fmtDate, fmtDateTime, istNow, label } from "@/lib/format";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("products:manage");
  const [p, categories] = await Promise.all([
    db.product.findUnique({ where: { id }, include: { batches: { orderBy: { expiryDate: "asc" } }, stockMovements: { orderBy: { createdAt: "desc" }, take: 30, include: { batch: true } } } }),
    db.category.findMany({ orderBy: { sort: "asc" } }),
  ]);
  if (!p) notFound();
  const today = istNow().date;
  return (
    <div className="space-y-6">
      <PageHeader title={p.name} sub={`${p.sku} · ${p.brand}`} />
      <div className="card"><ProductForm p={p} categories={categories} /></div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="section-title">Batches & expiry</h2>
          <table className="table mt-3">
            <thead><tr><th>Batch</th><th>Mfg</th><th>Expiry</th><th>Qty</th><th /></tr></thead>
            <tbody>{p.batches.map((b) => (
              <tr key={b.id}><td className="font-mono text-xs">{b.batchNo}</td><td>{fmtDate(b.mfgDate)}</td><td>{fmtDate(b.expiryDate)}</td><td>{b.quantity}</td>
                <td>{b.expiryDate <= today ? <Badge s="NO_SHOW" text="Expired – unavailable" /> : <Badge s="CONFIRMED" text="Sellable" />}</td></tr>
            ))}</tbody>
          </table>
          <ActionForm action={addBatch} submit="Add batch" resetOnSuccess className="mt-4 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="productId" value={p.id} />
            <Field label="Batch number" name="batchNo" required />
            <Field label="Quantity" name="quantity" type="number" required min={1} />
            <Field label="Manufacturing date" name="mfgDate" type="date" required />
            <Field label="Expiry date" name="expiryDate" type="date" required />
          </ActionForm>
        </div>
        <div className="card">
          <h2 className="section-title">Stock adjustment</h2>
          <ActionForm action={adjustStock} submit="Apply adjustment" resetOnSuccess className="mt-3 grid gap-3 sm:grid-cols-3">
            <Select label="Batch" name="batchId" required options={p.batches.map((b) => [b.id, `${b.batchNo} (${b.quantity})`] as [string, string])} />
            <Field label="Change (+/−)" name="change" type="number" required />
            <Select label="Reason" name="reason" required options={["ADJUSTMENT", "EXPIRED", "RETURN"]} />
          </ActionForm>
          <h3 className="mt-6 font-semibold">Stock movements</h3>
          <table className="table mt-2 text-xs">
            <tbody>{p.stockMovements.map((m) => <tr key={m.id}><td>{fmtDateTime(m.createdAt)}</td><td>{m.batch?.batchNo}</td><td className={m.change < 0 ? "text-red-700" : "text-forest-700"}>{m.change > 0 ? "+" : ""}{m.change}</td><td>{label(m.reason)}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
