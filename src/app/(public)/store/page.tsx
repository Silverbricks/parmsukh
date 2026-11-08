import Link from "next/link";
import { db } from "@/lib/db";
import { listProducts } from "@/lib/store";
import { ProductCard } from "@/components/product-card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Medicines & Products" };

export default async function Store({ searchParams }: { searchParams: Promise<{ category?: string; q?: string; system?: string }> }) {
  const sp = await searchParams;
  const [categories, products] = await Promise.all([
    db.category.findMany({ orderBy: { sort: "asc" } }),
    listProducts({ category: sp.category, q: sp.q?.slice(0, 80), system: sp.system }),
  ]);
  const active = categories.find((c) => c.slug === sp.category);
  return (
    <div className="container-p py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold">{active?.name ?? "Medicines & Products"}</h1>
          <p className="mt-1 text-sm text-charcoal-500">Ayurvedic, Homoeopathic, herbal and wellness products. Guests welcome.</p>
        </div>
        <form className="flex gap-2" action="/store">
          {sp.category && <input type="hidden" name="category" value={sp.category} />}
          <input className="input w-64" name="q" defaultValue={sp.q} placeholder="Search products, ingredients…" />
          <button className="btn-primary">Search</button>
        </form>
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr]">
        <aside className="space-y-1 text-sm">
          <Link href="/store" className={`block rounded-md px-3 py-2 ${!sp.category ? "bg-forest-700 text-white" : "hover:bg-forest-50"}`}>All products</Link>
          {categories.map((c) => (
            <Link key={c.id} href={`/store?category=${c.slug}`} className={`block rounded-md px-3 py-2 ${sp.category === c.slug ? "bg-forest-700 text-white" : "hover:bg-forest-50"}`}>{c.name}</Link>
          ))}
        </aside>
        <div>
          {products.length === 0 ? <p className="text-sm text-charcoal-500">No products found.</p> : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {products.map((p) => <ProductCard key={p.id} p={p} inStock={p.stock > 0} />)}
            </div>
          )}
          <p className="mt-8 text-xs text-charcoal-500">Product information is provided for general reference and is not a substitute for advice from a qualified practitioner. Prescription-only products can be purchased only against a valid PARMSUKH prescription.</p>
        </div>
      </div>
    </div>
  );
}
