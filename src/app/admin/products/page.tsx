import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { Badge, PageHeader } from "@/components/ui";
import { createCategory } from "@/app/actions/admin";
import { inr, istNow } from "@/lib/format";

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  await requirePermission("products:manage");
  const today = istNow().date;
  const [products, categories] = await Promise.all([
    db.product.findMany({ where: q ? { OR: [{ name: { contains: q } }, { sku: { contains: q } }, { brand: { contains: q } }] } : {}, include: { category: true, batches: true }, orderBy: { name: "asc" } }),
    db.category.findMany({ orderBy: { sort: "asc" }, include: { _count: { select: { products: true } } } }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Products & medicines" actions={<Link href="/admin/products/new" className="btn-primary">Add product</Link>} />
      <form className="card flex gap-2"><input className="input max-w-md" name="q" defaultValue={q} placeholder="Name, SKU or brand" /><button className="btn-primary">Search</button></form>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>SKU</th><th>Product</th><th>Category</th><th>MRP</th><th>Price</th><th>Sellable stock</th><th>Batches</th><th>Flags</th><th /></tr></thead>
          <tbody>{products.map((p) => {
            const sellable = p.batches.filter((b) => b.expiryDate > today).reduce((s, b) => s + b.quantity, 0);
            const expired = p.batches.filter((b) => b.expiryDate <= today && b.quantity > 0).reduce((s, b) => s + b.quantity, 0);
            return (
              <tr key={p.id}>
                <td className="font-mono text-xs">{p.sku}</td>
                <td>{p.name}<div className="text-xs text-charcoal-500">{p.brand} · {p.packSize}</div></td>
                <td className="text-xs">{p.category.name}</td><td>{inr(p.mrp)}</td><td>{inr(p.price)}</td>
                <td>{sellable <= 10 ? <span className="font-semibold text-red-700">{sellable}</span> : sellable}{expired > 0 && <div className="text-xs text-red-700">{expired} expired</div>}</td>
                <td>{p.batches.length}</td>
                <td className="space-x-1">{!p.active && <Badge s="CANCELLED" text="Hidden" />}{p.requiresPrescription && <Badge s="URGENT" text="℞ only" />}{p.restricted && <Badge s="PROMPT" text="No guest" />}{p.ownBrand && <Badge s="PAID" text="Own brand" />}</td>
                <td><Link href={`/admin/products/${p.id}`} className="text-forest-700 underline">Edit</Link></td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      <div className="card">
        <h2 className="section-title">Categories</h2>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">{categories.map((c) => <span key={c.id} className="badge bg-ivory-200 text-charcoal-700">{c.name} ({c._count.products})</span>)}</div>
        <form action={createCategory} className="mt-3 flex gap-2"><input className="input max-w-xs" name="name" placeholder="New category" required /><button className="btn-outline">Add</button></form>
      </div>
    </div>
  );
}
