import Link from "next/link";
import { listProducts } from "@/lib/store";
import { ProductCard } from "./product-card";

export async function SystemPage({ system, title, intro, points }: { system: "AYURVEDA" | "HOMOEOPATHY"; title: string; intro: string; points: string[] }) {
  const products = (await listProducts({ system })).slice(0, 4);
  return (
    <div className="container-p py-12">
      <h1 className="text-4xl font-semibold">{title}</h1>
      <p className="mt-4 max-w-3xl text-charcoal-700">{intro}</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {points.map((p) => <div key={p} className="card text-sm text-charcoal-700">{p}</div>)}
      </div>
      <div className="mt-8 flex gap-3">
        <Link href={`/book-consultation?system=${system}`} className="btn-primary">Book a {title} consultation</Link>
        <Link href={`/store?system=${system}`} className="btn-outline">Browse {title} products</Link>
      </div>
      <p className="mt-6 max-w-3xl text-xs text-charcoal-500">
        Complementary therapies are offered alongside – not instead of – conventional medical care. Outcomes vary between individuals and are not guaranteed.
      </p>
      {products.length > 0 && (
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          {products.map((p) => <ProductCard key={p.id} p={p} inStock={p.stock > 0} />)}
        </div>
      )}
    </div>
  );
}
