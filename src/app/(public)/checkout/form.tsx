"use client";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useCart } from "@/components/cart";
import { placeOrder, quoteCart } from "@/app/actions/store";
import { OtpField } from "@/components/otp-field";
import { FormMessage, Submit } from "@/components/submit";
import { Field } from "@/components/ui";

type Profile = { name: string; mobile: string; email: string; line1: string; line2: string; city: string; state: string; pinCode: string } | null;
const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

export function CheckoutForm({ profile, coupon }: { profile: Profile; coupon: string }) {
  const cart = useCart();
  const [q, setQ] = useState<Awaited<ReturnType<typeof quoteCart>> | null>(null);
  const [state, action] = useActionState(placeOrder, null);

  useEffect(() => { quoteCart(cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })), coupon).then(setQ); }, [cart.items, coupon]);
  useEffect(() => { if (state && "ok" in state) cart.clear(); }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  if (state && "ok" in state) {
    return (
      <div className="card text-center">
        <div className="text-sm uppercase tracking-wide text-gold-700">Order confirmed</div>
        <div className="mt-2 font-serif text-4xl font-semibold text-forest-800">{state.number}</div>
        <p className="mt-2 text-sm">Total {inr(state.total)}. A confirmation SMS has been sent.</p>
        <div className="mt-6 flex justify-center gap-2">
          {state.guest ? <><Link href="/track-order" className="btn-outline">Track order</Link><Link href="/register" className="btn-primary">Create account</Link></>
            : <Link href="/dashboard/orders" className="btn-primary">View my orders</Link>}
        </div>
      </div>
    );
  }
  if (!cart.items.length) return <p className="text-sm">Your cart is empty. <Link href="/store" className="underline">Browse products</Link></p>;

  const blocked = !!q && !q.loggedIn && (q.needsPrescription || q.hasRestricted);
  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <input type="hidden" name="lines" value={JSON.stringify(cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })))} />
      <input type="hidden" name="coupon" value={coupon} />
      <div className="space-y-6">
        <section className="card space-y-4">
          <h2 className="section-title">Contact</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" name="name" required defaultValue={profile?.name} autoComplete="name" />
            <Field label="Email (optional)" name="email" type="email" defaultValue={profile?.email} autoComplete="email" />
          </div>
          {profile ? <Field label="Mobile" name="mobile" defaultValue={profile.mobile} required inputMode="numeric" maxLength={10} /> : <OtpField purpose="GUEST_ORDER" />}
        </section>
        <section className="card space-y-4">
          <h2 className="section-title">Delivery address</h2>
          <Field label="Address line 1" name="line1" required defaultValue={profile?.line1} autoComplete="address-line1" />
          <Field label="Address line 2" name="line2" defaultValue={profile?.line2} autoComplete="address-line2" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="City" name="city" required defaultValue={profile?.city} autoComplete="address-level2" />
            <Field label="State" name="state" required defaultValue={profile?.state || "Punjab"} autoComplete="address-level1" />
            <Field label="PIN code" name="pinCode" required defaultValue={profile?.pinCode} inputMode="numeric" maxLength={6} pattern="\d{6}" autoComplete="postal-code" />
          </div>
        </section>
        <section className="card space-y-2 text-sm">
          <h2 className="section-title">Payment</h2>
          <label className="flex items-center gap-2"><input type="radio" name="paymentMethod" value="COD" defaultChecked /> Cash on delivery</label>
          <label className="flex items-center gap-2"><input type="radio" name="paymentMethod" value="ONLINE_MOCK" /> Pay online <span className="text-xs text-charcoal-500">(test gateway – no real charge)</span></label>
        </section>
      </div>
      <aside className="card h-fit space-y-2 text-sm">
        <h2 className="section-title">Order summary</h2>
        {q?.items.map((i) => <div key={i.productId} className="flex justify-between gap-2"><span>{i.name} × {i.quantity}</span><span>{inr(i.price * i.quantity)}</span></div>)}
        {q && (
          <>
            <div className="flex justify-between border-t border-ivory-200 pt-2"><span>Subtotal</span><span>{inr(q.subtotal)}</span></div>
            {q.discount > 0 && <div className="flex justify-between text-forest-700"><span>Coupon {q.coupon}</span><span>−{inr(q.discount)}</span></div>}
            <div className="flex justify-between"><span>Delivery</span><span>{q.shipping ? inr(q.shipping) : "Free"}</span></div>
            <div className="flex justify-between text-xs text-charcoal-500"><span>Includes GST</span><span>{inr(q.tax)}</span></div>
            <div className="flex justify-between border-t border-ivory-200 pt-2 text-base font-semibold"><span>Total</span><span>{inr(q.total)}</span></div>
          </>
        )}
        {blocked && <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-800">Your cart has prescription-only items. <Link href="/login?next=/checkout" className="underline">Log in</Link> to continue, or remove them.</p>}
        {q?.needsPrescription && q.loggedIn && <p className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-900">Prescription-only items will be checked against your approved PARMSUKH prescriptions.</p>}
        <FormMessage state={state && "error" in state ? state : null} />
        <Submit className="btn-primary w-full" pendingText="Placing order…">Place order</Submit>
      </aside>
    </form>
  );
}
