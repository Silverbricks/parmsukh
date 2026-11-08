import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { sellableBatchWhere } from "@/lib/store";
import { fmtDate, inr } from "@/lib/format";
import { ProductArt } from "@/components/brand";
import { AddToCart } from "./add";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await db.product.findUnique({ where: { slug }, include: { category: true, batches: { where: sellableBatchWhere(), orderBy: { expiryDate: "asc" } } } });
  if (!p || !p.active) notFound();
  const stock = p.batches.reduce((s, b) => s + b.quantity, 0);
  const next = p.batches[0];
  const off = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
  const rows: [string, string][] = [
    ["Brand", p.brand], ["Manufacturer", p.manufacturer], ["Category", p.category.name], ["Pack size", p.packSize],
    ["Batch (next to ship)", next ? next.batchNo : "—"], ["Manufactured", next ? fmtDate(next.mfgDate) : "—"], ["Expiry", next ? fmtDate(next.expiryDate) : "—"],
    ["Regulatory / licence", p.regulatoryInfo || "—"], ["Returns", p.returnEligible ? "Eligible within 7 days if unopened" : "Not returnable"],
  ];
  return (
    <div className="container-p py-10">
      <nav className="mb-4 text-sm text-charcoal-500"><Link href="/store" className="hover:underline">Store</Link> / <Link href={`/store?category=${p.category.slug}`} className="hover:underline">{p.category.name}</Link></nav>
      <div className="grid gap-8 md:grid-cols-2">
        <ProductArt name={p.name} system={p.system} className="max-w-md" />
        <div>
          <div className="text-sm text-charcoal-500">{p.brand}</div>
          <h1 className="text-4xl font-semibold">{p.name}</h1>
          <div className="mt-1 text-sm text-charcoal-500">{p.packSize}</div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-serif text-3xl font-semibold text-forest-800">{inr(p.price)}</span>
            {off > 0 && <><span className="text-charcoal-500 line-through">MRP {inr(p.mrp)}</span><span className="badge bg-gold-100 text-gold-700">{off}% off</span></>}
          </div>
          <div className="text-xs text-charcoal-500">Inclusive of all taxes</div>
          {p.requiresPrescription && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              Prescription required. This product is supplied only to registered patients with a valid prescription from a PARMSUKH practitioner.
              <Link href="/book-consultation" className="ml-1 underline">Book a consultation</Link>
            </div>
          )}
          <div className="mt-5">
            {stock > 0 ? <AddToCart item={{ productId: p.id, name: p.name, price: p.price, mrp: p.mrp, slug: p.slug }} max={Math.min(stock, 20)} />
              : <span className="badge bg-stone-200 px-3 py-1 text-sm text-stone-700">Currently out of stock</span>}
            {stock > 0 && stock <= 5 && <p className="mt-2 text-xs text-gold-700">Only {stock} left</p>}
          </div>
          <p className="mt-6 text-charcoal-700">{p.description}</p>
          {p.ingredients && <><h2 className="mt-6 text-lg font-semibold">Ingredients</h2><p className="text-sm text-charcoal-700">{p.ingredients}</p></>}
          {p.usage && <><h2 className="mt-4 text-lg font-semibold">Usage</h2><p className="text-sm text-charcoal-700">{p.usage}</p></>}
          {p.warnings && <><h2 className="mt-4 text-lg font-semibold">Warnings & precautions</h2><p className="text-sm text-charcoal-700">{p.warnings}</p></>}
          <table className="table mt-6"><tbody>{rows.map(([k, v]) => <tr key={k}><td className="w-48 text-charcoal-500">{k}</td><td>{v}</td></tr>)}</tbody></table>
          <p className="mt-4 text-xs text-charcoal-500">Shipping: free over ₹999, otherwise ₹60. Usually dispatched within 2 working days.</p>
        </div>
      </div>
    </div>
  );
}
