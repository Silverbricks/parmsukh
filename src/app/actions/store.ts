"use server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { priceCart, type CartLine } from "@/lib/pricing";
import { normaliseMobile, sendOtp, verifyOtp } from "@/lib/otp";
import { nextOrderNo } from "@/lib/ids";
import { notify } from "@/lib/notify";
import { audit } from "@/lib/audit";
import { istNow, str } from "@/lib/format";

function parseLines(raw: string): CartLine[] {
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, 50).map((l) => ({ productId: String(l.productId), quantity: Number(l.quantity) || 1 }));
  } catch { return []; }
}

export async function quoteCart(lines: CartLine[], coupon?: string) {
  const s = await getSession();
  const q = await priceCart(lines, coupon);
  return {
    items: q.items.map((i) => ({
      productId: i.product.id, name: i.product.name, slug: i.product.slug, quantity: i.quantity, stock: i.stock,
      price: i.product.price, mrp: i.product.mrp, requiresPrescription: i.product.requiresPrescription, restricted: i.product.restricted,
    })),
    subtotal: q.subtotal, mrpTotal: q.mrpTotal, savings: q.savings, discount: q.discount, coupon: q.coupon,
    shipping: q.shipping, tax: q.tax, total: q.total, needsPrescription: q.needsPrescription, hasRestricted: q.hasRestricted,
    loggedIn: s?.role === "PATIENT",
  };
}

export type CheckoutState = null | { error: string } | { ok: true; number: string; total: number; guest: boolean };

export async function placeOrder(_: CheckoutState, fd: FormData): Promise<CheckoutState> {
  const s = await getSession();
  const lines = parseLines(str(fd, "lines"));
  if (!lines.length) return { error: "Your cart is empty." };
  const q = await priceCart(lines, str(fd, "coupon"));
  if (!q.items.length) return { error: "None of the items in your cart are available." };
  for (const i of q.items) if (i.quantity > i.stock) return { error: `Only ${i.stock} of “${i.product.name}” available.` };

  const isPatient = s?.role === "PATIENT";
  const patient = isPatient ? await db.patient.findUnique({ where: { userId: s!.uid } }) : null;

  // Special medicine controls (SRS v3 §7.5)
  if (!isPatient && (q.hasRestricted || q.needsPrescription))
    return { error: "Your cart contains prescription-only or restricted products. Please log in as a patient with a valid prescription from a PARMSUKH practitioner." };
  let prescriptionId: string | null = null;
  if (q.needsPrescription && patient) {
    const rxProducts = q.items.filter((i) => i.product.requiresPrescription).map((i) => i.product.id);
    const rx = await db.prescription.findFirst({
      where: {
        patientId: patient.id, approved: true, kind: "CLINICAL_PRESCRIPTION",
        OR: [{ validUntil: null }, { validUntil: { gte: istNow().date } }],
        AND: rxProducts.map((pid) => ({ items: { some: { productId: pid } } })),
      },
      orderBy: { createdAt: "desc" },
    });
    if (!rx) return { error: "A valid, practitioner-approved prescription covering the prescription-only items is required." };
    prescriptionId = rx.id;
  }

  const name = str(fd, "name"), line1 = str(fd, "line1"), city = str(fd, "city"), state = str(fd, "state"), pinCode = str(fd, "pinCode");
  if (!name || !line1 || !city || !state || !/^\d{6}$/.test(pinCode)) return { error: "Please complete the delivery address (6-digit PIN code)." };
  let mobile: string | null;
  if (isPatient) {
    mobile = normaliseMobile(str(fd, "mobile")) ?? patient!.mobile;
  } else {
    mobile = normaliseMobile(str(fd, "mobile"));
    if (!mobile) return { error: "Enter a valid mobile number." };
    const v = await verifyOtp(mobile, "GUEST_ORDER", str(fd, "otp"));
    if (!v.ok) return { error: v.error };
  }
  const paymentMethod = str(fd, "paymentMethod") === "ONLINE_MOCK" ? "ONLINE_MOCK" : "COD";
  const number = await nextOrderNo();

  try {
    const order = await db.$transaction(async (tx) => {
      const o = await tx.order.create({
        data: {
          number, userId: isPatient ? s!.uid : null, patientId: patient?.id ?? null, isGuest: !isPatient,
          name, mobile: mobile!, email: str(fd, "email") || null, line1, line2: str(fd, "line2") || null, city, state, pinCode,
          subtotal: q.subtotal, discount: q.discount, shipping: q.shipping, tax: q.tax, total: q.total, couponCode: q.coupon,
          prescriptionId, paymentMethod, paymentStatus: paymentMethod === "ONLINE_MOCK" ? "PAID" : "PENDING", status: "CONFIRMED",
          events: { create: [{ status: "CONFIRMED", note: "Order placed" }] },
        },
      });
      // Allocate stock first-expiry-first-out from non-expired batches.
      for (const i of q.items) {
        let need = i.quantity;
        const batches = await tx.productBatch.findMany({ where: { productId: i.product.id, quantity: { gt: 0 }, expiryDate: { gt: istNow().date } }, orderBy: { expiryDate: "asc" } });
        for (const b of batches) {
          if (need <= 0) break;
          const take = Math.min(need, b.quantity);
          const upd = await tx.productBatch.updateMany({ where: { id: b.id, quantity: { gte: take } }, data: { quantity: { decrement: take } } });
          if (upd.count !== 1) throw new Error("STOCK");
          await tx.stockMovement.create({ data: { productId: i.product.id, batchId: b.id, change: -take, reason: "SALE", refId: o.id } });
          await tx.orderItem.create({ data: { orderId: o.id, productId: i.product.id, batchNo: b.batchNo, name: i.product.name, quantity: take, mrp: i.product.mrp, price: i.product.price } });
          need -= take;
        }
        if (need > 0) throw new Error("STOCK");
      }
      if (paymentMethod === "ONLINE_MOCK") await tx.payment.create({ data: { kind: "ORDER", refId: o.id, amount: q.total, method: "ONLINE_MOCK", status: "PAID", gatewayRef: `MOCK-${number}` } });
      return o;
    });
    await notify({ mobile: mobile!, channel: "SMS", subject: "Order placed", message: `PARMSUKH: order ${number} confirmed. Track at parmsukh.com/track-order` });
    await audit(s, "ORDER_PLACED", "Order", order.id, { guest: !isPatient });
    return { ok: true, number, total: q.total, guest: !isPatient };
  } catch (e) {
    if (e instanceof Error && e.message === "STOCK") return { error: "Stock changed while you were checking out. Please review your cart." };
    throw e;
  }
}

// Order tracking for guests: order number + OTP to the mobile on the order.
export async function requestTrackOtp(number: string, mobileRaw: string) {
  const mobile = normaliseMobile(mobileRaw);
  const o = mobile ? await db.order.findUnique({ where: { number: number.trim().toUpperCase() } }) : null;
  // Same response whether or not the order exists, to avoid leaking order data.
  if (!o || o.mobile !== mobile) return { ok: true, devOtp: undefined };
  const r = await sendOtp(mobile!, "TRACK_ORDER");
  return r.ok ? { ok: true, devOtp: r.devOtp } : { ok: false, error: r.error };
}

export async function trackOrder(number: string, mobileRaw: string, code: string) {
  const mobile = normaliseMobile(mobileRaw);
  if (!mobile) return { error: "Invalid mobile number." };
  const v = await verifyOtp(mobile, "TRACK_ORDER", code);
  if (!v.ok) return { error: v.error };
  const o = await db.order.findUnique({ where: { number: number.trim().toUpperCase() }, include: { items: true, events: { orderBy: { createdAt: "asc" } } } });
  if (!o || o.mobile !== mobile) return { error: "Order not found for this mobile number." };
  return {
    order: {
      number: o.number, status: o.status, paymentStatus: o.paymentStatus, total: o.total, courier: o.courier, trackingNo: o.trackingNo,
      items: o.items.map((i) => ({ name: i.name, quantity: i.quantity })),
      events: o.events.map((e) => ({ status: e.status, note: e.note, at: e.createdAt.toISOString() })),
    },
  };
}
