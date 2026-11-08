import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { ActionForm } from "@/components/action-form";
import { Badge, Field, PageHeader, Select } from "@/components/ui";
import { createCoupon, toggleCoupon } from "@/app/actions/admin";
import { fmtDate, inr, label } from "@/lib/format";

export default async function Coupons() {
  await requirePermission("products:manage");
  const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="space-y-6">
      <PageHeader title="Coupons & discounts" />
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Code</th><th>Discount</th><th>Max</th><th>Applies to</th><th>Expires</th><th>Status</th><th /></tr></thead>
          <tbody>{coupons.map((c) => (
            <tr key={c.id}><td className="font-mono">{c.code}</td><td>{c.percentOff}%</td><td>{c.maxOff ? inr(c.maxOff) : "—"}</td><td>{label(c.appliesTo)}</td><td>{fmtDate(c.expiresAt)}</td>
              <td>{c.active ? <Badge s="CONFIRMED" text="Active" /> : <Badge s="CANCELLED" text="Disabled" />}</td>
              <td><form action={toggleCoupon}><input type="hidden" name="id" value={c.id} /><button className="btn-ghost btn-sm">{c.active ? "Disable" : "Enable"}</button></form></td></tr>
          ))}</tbody>
        </table>
      </div>
      <div className="card max-w-2xl">
        <h2 className="section-title">New coupon</h2>
        <ActionForm action={createCoupon} submit="Create coupon" resetOnSuccess className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Code" name="code" required />
          <Field label="Percent off" name="percentOff" type="number" required min={1} max={90} />
          <Field label="Maximum discount (₹)" name="maxOff" type="number" />
          <Select label="Applies to" name="appliesTo" required options={["ALL", "STORE", "CONSULTATION"]} />
          <Field label="Expires on" name="expiresAt" type="date" />
        </ActionForm>
      </div>
    </div>
  );
}
