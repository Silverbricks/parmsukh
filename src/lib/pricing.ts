import { db } from "./db";
import { istNow } from "./format";

export const FREE_SHIPPING_OVER = 999;
export const SHIPPING_FEE = 60;

export type CartLine = { productId: string; quantity: number };

export async function findCoupon(code: string | null | undefined, scope: "STORE" | "CONSULTATION") {
  if (!code) return null;
  const c = await db.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!c || !c.active) return null;
  if (c.expiresAt && c.expiresAt < istNow().date) return null;
  if (c.appliesTo !== "ALL" && c.appliesTo !== scope) return null;
  return c;
}

export function couponDiscount(amount: number, c: { percentOff: number; maxOff: number | null } | null) {
  if (!c) return 0;
  const d = Math.floor((amount * c.percentOff) / 100);
  return c.maxOff ? Math.min(d, c.maxOff) : d;
}

/** Server-side price calculation. Never trust client prices. */
export async function priceCart(lines: CartLine[], couponCode?: string | null) {
  const ids = [...new Set(lines.map((l) => l.productId))];
  const products = await db.product.findMany({
    where: { id: { in: ids }, active: true },
    include: { batches: { where: { quantity: { gt: 0 }, expiryDate: { gt: istNow().date } }, orderBy: { expiryDate: "asc" } } },
  });
  const items = lines.flatMap((l) => {
    const p = products.find((x) => x.id === l.productId);
    if (!p) return [];
    const stock = p.batches.reduce((s, b) => s + b.quantity, 0);
    const quantity = Math.max(1, Math.min(Math.floor(l.quantity), 20));
    return [{ product: p, quantity, stock, lineTotal: p.price * quantity, lineMrp: p.mrp * quantity }];
  });
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const mrpTotal = items.reduce((s, i) => s + i.lineMrp, 0);
  const coupon = await findCoupon(couponCode, "STORE");
  const discount = couponDiscount(subtotal, coupon);
  const afterDiscount = subtotal - discount;
  const shipping = items.length === 0 || afterDiscount >= FREE_SHIPPING_OVER ? 0 : SHIPPING_FEE;
  // Prices are GST-inclusive; compute the included tax component for the invoice.
  const tax = Math.round(items.reduce((s, i) => {
    const share = subtotal ? (i.lineTotal / subtotal) * afterDiscount : 0;
    return s + (share * i.product.gstPercent) / (100 + i.product.gstPercent);
  }, 0));
  return {
    items, subtotal, mrpTotal, savings: mrpTotal - subtotal + discount, discount,
    coupon: coupon?.code ?? null, shipping, tax, total: afterDiscount + shipping,
    needsPrescription: items.some((i) => i.product.requiresPrescription),
    hasRestricted: items.some((i) => i.product.restricted),
  };
}
