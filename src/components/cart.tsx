"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type CartItem = { productId: string; quantity: number; name: string; price: number; mrp: number; slug: string };
type Ctx = {
  items: CartItem[]; count: number;
  add: (i: Omit<CartItem, "quantity">, qty?: number) => void;
  setQty: (id: string, qty: number) => void; remove: (id: string) => void; clear: () => void;
};
const CartCtx = createContext<Ctx | null>(null);
const KEY = "parmsukh_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) setItems(JSON.parse(raw)); } catch {}
  }, []);
  const persist = useCallback((next: CartItem[]) => {
    setItems(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  }, []);
  const ctx: Ctx = {
    items,
    count: items.reduce((s, i) => s + i.quantity, 0),
    add: (i, qty = 1) => {
      const ex = items.find((x) => x.productId === i.productId);
      persist(ex ? items.map((x) => (x.productId === i.productId ? { ...x, quantity: Math.min(20, x.quantity + qty) } : x)) : [...items, { ...i, quantity: qty }]);
    },
    setQty: (id, qty) => persist(items.map((x) => (x.productId === id ? { ...x, quantity: Math.max(1, Math.min(20, qty)) } : x))),
    remove: (id) => persist(items.filter((x) => x.productId !== id)),
    clear: () => persist([]),
  };
  return <CartCtx.Provider value={ctx}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}

export function CartCount() {
  const { count } = useCart();
  if (!count) return null;
  return <span className="ml-1 rounded-full bg-gold-500 px-1.5 text-xs font-semibold text-forest-900">{count}</span>;
}
