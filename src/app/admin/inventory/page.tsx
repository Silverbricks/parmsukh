import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { Badge, PageHeader } from "@/components/ui";
import { addDays, fmtDate, fmtDateTime, istNow, label } from "@/lib/format";

export default async function Inventory() {
  await requirePermission("products:manage");
  const today = istNow().date;
  const [batches, movements] = await Promise.all([
    db.productBatch.findMany({ where: { quantity: { gt: 0 } }, include: { product: true }, orderBy: { expiryDate: "asc" } }),
    db.stockMovement.findMany({ include: { product: true, batch: true }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  const status = (exp: string) => exp <= today ? <Badge s="NO_SHOW" text="Expired" /> : exp <= addDays(today, 30) ? <Badge s="URGENT" text="< 30 days" /> : exp <= addDays(today, 90) ? <Badge s="PENDING" text="< 90 days" /> : <Badge s="CONFIRMED" text="OK" />;
  return (
    <div className="space-y-6">
      <PageHeader title="Inventory & expiry" sub="Expired batches are automatically excluded from sale. Write them off with an EXPIRED adjustment." />
      <div className="card overflow-x-auto">
        <h2 className="section-title mb-3">Batches in stock (first-expiry-first-out)</h2>
        <table className="table">
          <thead><tr><th>Product</th><th>Batch</th><th>Mfg</th><th>Expiry</th><th>Qty</th><th>Status</th></tr></thead>
          <tbody>{batches.map((b) => (
            <tr key={b.id}><td><Link href={`/admin/products/${b.productId}`} className="hover:underline">{b.product.name}</Link></td><td className="font-mono text-xs">{b.batchNo}</td><td>{fmtDate(b.mfgDate)}</td><td>{fmtDate(b.expiryDate)}</td><td>{b.quantity}</td><td>{status(b.expiryDate)}</td></tr>
          ))}</tbody>
        </table>
      </div>
      <div className="card overflow-x-auto">
        <h2 className="section-title mb-3">Recent stock movements</h2>
        <table className="table text-xs">
          <thead><tr><th>When</th><th>Product</th><th>Batch</th><th>Change</th><th>Reason</th></tr></thead>
          <tbody>{movements.map((m) => <tr key={m.id}><td>{fmtDateTime(m.createdAt)}</td><td>{m.product.name}</td><td>{m.batch?.batchNo}</td><td className={m.change < 0 ? "text-red-700" : "text-forest-700"}>{m.change > 0 ? "+" : ""}{m.change}</td><td>{label(m.reason)}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
