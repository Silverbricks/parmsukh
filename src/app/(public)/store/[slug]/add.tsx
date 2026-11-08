"use client";
import Link from "next/link";
import { useState } from "react";
import { useCart, type CartItem } from "@/components/cart";

export function AddToCart({ item, max }: { item: Omit<CartItem, "quantity">; max: number }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center rounded-lg border border-stone-300">
        <button type="button" className="px-3 py-2" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease">−</button>
        <span className="w-8 text-center">{qty}</span>
        <button type="button" className="px-3 py-2" onClick={() => setQty(Math.min(max, qty + 1))} aria-label="Increase">+</button>
      </div>
      <button type="button" className="btn-primary" onClick={() => { add(item, qty); setAdded(true); }}>Add to cart</button>
      {added && <Link href="/cart" className="btn-outline">View cart →</Link>}
    </div>
  );
}
