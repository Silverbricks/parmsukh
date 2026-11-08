"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart";
import { quoteCart } from "@/app/actions/store";

type Quote = Awaited<ReturnType<typeof quoteCart>>;
const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

export default function CartPage() {
  const cart = useCart();
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState("");
  const [q, setQ] = useState<Quote | null>(null);

  useEffect(() => {
    let live = true;
    quoteCart(cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })), applied).then((r) => live && setQ(r));
    return () => { live = false; };
  }, [cart.items, applied]);

  if (!cart.items.length) {
    return (
      <div className="container-p max-w-3xl py-16 text-center">
        <h1 className="text-4xl font-semibold">Your cart is empty</h1>
        <Link href="/store" className="btn-primary mt-6">Browse products</Link>
      </div>
    );
  }
  return (
    <div className="container-p grid gap-8 py-10 lg:grid-cols-[1fr_360px]">
      <div>
        <h1 className="text-4xl font-semibold">Cart</h1>
        <div className="card mt-6 divide-y divide-ivory-200 p-0">
          {cart.items.map((i) => {
            const live = q?.items.find((x) => x.productId === i.productId);
            return (
              <div key={i.productId} className="flex flex-wrap items-center gap-4 p-4">
                <div className="flex-1">
                  <Link href={`/store/${i.slug}`} className="font-medium hover:text-forest-700">{i.name}</Link>
                  <div className="text-sm"><b>{inr(live?.price ?? i.price)}</b> <span className="text-xs text-charcoal-500 line-through">{inr(live?.mrp ?? i.mrp)}</span></div>
                  {live?.requiresPrescription && <div className="text-xs text-red-700">Prescription required</div>}
                  {q && !live && <div className="text-xs text-red-700">No longer available – please remove</div>}
                  {live && live.quantity > live.stock && <div className="text-xs text-red-700">Only {live.stock} in stock</div>}
                </div>
                <div className="flex items-center rounded-lg border border-stone-300">
                  <button className="px-3 py-1" onClick={() => cart.setQty(i.productId, i.quantity - 1)}>−</button>
                  <span className="w-8 text-center text-sm">{i.quantity}</span>
                  <button className="px-3 py-1" onClick={() => cart.setQty(i.productId, i.quantity + 1)}>+</button>
                </div>
                <div className="w-20 text-right font-medium">{inr((live?.price ?? i.price) * i.quantity)}</div>
                <button className="text-xs text-red-700 hover:underline" onClick={() => cart.remove(i.productId)}>Remove</button>
              </div>
            );
          })}
        </div>
      </div>
      <aside className="card h-fit space-y-3 text-sm lg:mt-16">
        <div className="flex gap-2">
          <input className="input" placeholder="Coupon code" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} />
          <button className="btn-outline" onClick={() => setApplied(coupon)}>Apply</button>
        </div>
        {applied && q && !q.coupon && <p className="text-xs text-red-700">Coupon not valid.</p>}
        {q && (
          <>
            <div className="flex justify-between"><span>MRP total</span><span>{inr(q.mrpTotal)}</span></div>
            <div className="flex justify-between"><span>Subtotal</span><span>{inr(q.subtotal)}</span></div>
            {q.discount > 0 && <div className="flex justify-between text-forest-700"><span>Coupon {q.coupon}</span><span>−{inr(q.discount)}</span></div>}
            <div className="flex justify-between"><span>Delivery</span><span>{q.shipping ? inr(q.shipping) : "Free"}</span></div>
            <div className="flex justify-between text-xs text-charcoal-500"><span>Includes GST</span><span>{inr(q.tax)}</span></div>
            <div className="flex justify-between border-t border-ivory-200 pt-3 text-base font-semibold"><span>Total payable</span><span>{inr(q.total)}</span></div>
            {q.savings > 0 && <div className="rounded bg-forest-50 px-3 py-2 text-forest-800">You save {inr(q.savings)}</div>}
            {(q.needsPrescription || q.hasRestricted) && !q.loggedIn && (
              <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-800">Prescription-only items need a patient login and a valid PARMSUKH prescription.</p>
            )}
          </>
        )}
        <Link href={`/checkout${applied ? `?coupon=${encodeURIComponent(applied)}` : ""}`} className="btn-primary w-full">Checkout</Link>
        <Link href="/store" className="btn-ghost w-full">Continue shopping</Link>
      </aside>
    </div>
  );
}
