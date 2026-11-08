import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { CheckoutForm } from "./form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout" };

export default async function Checkout({ searchParams }: { searchParams: Promise<{ coupon?: string }> }) {
  const { coupon } = await searchParams;
  const s = await getSession();
  let profile = null;
  if (s?.role === "PATIENT") {
    const p = await db.patient.findUnique({ where: { userId: s.uid } });
    const addr = await db.address.findFirst({ where: { userId: s.uid }, orderBy: { isDefault: "desc" } });
    if (p) profile = {
      name: addr?.name ?? `${p.firstName} ${p.lastName}`.trim(), mobile: addr?.mobile ?? p.mobile, email: p.email ?? "",
      line1: addr?.line1 ?? p.address ?? "", line2: addr?.line2 ?? "", city: addr?.city ?? p.city ?? "", state: addr?.state ?? p.state ?? "", pinCode: addr?.pinCode ?? p.pinCode ?? "",
    };
  }
  return (
    <div className="container-p max-w-5xl py-10">
      <h1 className="text-4xl font-semibold">Checkout</h1>
      <p className="mt-1 text-sm text-charcoal-500">{profile ? "Signed in – this order will appear in your dashboard." : "Checking out as guest. Your mobile number will be verified by OTP."}</p>
      <div className="mt-6"><CheckoutForm profile={profile} coupon={coupon ?? ""} /></div>
    </div>
  );
}
