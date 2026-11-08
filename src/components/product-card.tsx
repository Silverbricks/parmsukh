import Link from "next/link";
import { inr } from "@/lib/format";
import { ProductArt } from "./brand";

export function ProductCard({ p, inStock }: { p: { slug: string; name: string; brand: string; system: string; mrp: number; price: number; packSize: string; requiresPrescription: boolean }; inStock: boolean }) {
  const off = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
  return (
    <Link href={`/store/${p.slug}`} className="card group flex flex-col p-3 transition hover:shadow-md">
      <ProductArt name={p.name} system={p.system} />
      <div className="mt-3 flex-1">
        <div className="text-xs text-charcoal-500">{p.brand}</div>
        <div className="font-medium text-charcoal-900 group-hover:text-forest-700">{p.name}</div>
        <div className="text-xs text-charcoal-500">{p.packSize}</div>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-semibold text-forest-800">{inr(p.price)}</span>
        {off > 0 && <><span className="text-xs text-charcoal-500 line-through">{inr(p.mrp)}</span><span className="text-xs font-medium text-gold-700">{off}% off</span></>}
      </div>
      <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
        {p.requiresPrescription && <span className="badge bg-red-50 text-red-700">Prescription required</span>}
        {!inStock && <span className="badge bg-stone-200 text-stone-700">Out of stock</span>}
      </div>
    </Link>
  );
}
