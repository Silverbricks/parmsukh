import Link from "next/link";
import { db } from "@/lib/db";
import { listProducts } from "@/lib/store";
import { CLINIC, COMPLAINT_CATEGORIES } from "@/lib/constants";
import { inr } from "@/lib/format";
import { ProductCard } from "@/components/product-card";
import { LotusMark } from "@/components/brand";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [doctors, products] = await Promise.all([
    db.doctor.findMany({ where: { active: true }, include: { user: true }, take: 3 }),
    listProducts(),
  ]);
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-forest-800 via-forest-700 to-forest-900 text-ivory-50">
        <div className="container-p grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-gold-300">{CLINIC.name}</p>
            <h1 className="mt-4 font-serif text-5xl font-semibold leading-tight text-ivory-50 md:text-6xl">{CLINIC.tagline}</h1>
            <p className="mt-5 max-w-lg text-ivory-100/85">
              Individualised Ayurveda and Homoeopathy consultations with {CLINIC.practitioner} – in person at Bathinda, online or by phone.
              Practitioner-supervised care that works alongside conventional medicine.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/book-consultation" className="btn-gold px-6 py-3 text-base">Book a consultation</Link>
              <Link href="/store" className="btn border border-ivory-100/40 px-6 py-3 text-base text-ivory-50 hover:bg-forest-600">Shop medicines & products</Link>
            </div>
            <p className="mt-4 text-xs text-ivory-100/70">No account needed – book or shop as a guest with mobile OTP verification.</p>
          </div>
          <div className="hidden justify-center md:flex"><LotusMark className="h-72 w-72 opacity-90" /></div>
        </div>
      </section>

      <section className="container-p -mt-8 grid gap-4 md:grid-cols-3">
        {[
          ["Create patient account", "Keep your case history, consultations, prescriptions and orders in one secure place.", "/register", "Register"],
          ["Existing patient", "Log in with your mobile number and OTP to see your dashboard.", "/login", "Login"],
          ["Continue as guest", "Book a consultation or buy products without registering.", "/book-consultation", "Book as guest"],
        ].map(([t, d, h, c]) => (
          <div key={t} className="card relative z-10">
            <h3 className="text-xl font-semibold">{t}</h3>
            <p className="mt-1 text-sm text-charcoal-500">{d}</p>
            <Link href={h} className="btn-outline btn-sm mt-4">{c}</Link>
          </div>
        ))}
      </section>

      <section className="container-p mt-16">
        <h2 className="text-3xl font-semibold">Health concerns we support</h2>
        <p className="mt-1 text-sm text-charcoal-500">Dedicated, confidential questionnaires help your practitioner understand your history before you meet.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {COMPLAINT_CATEGORIES.filter((c) => c.key !== "GENERAL").map((c) => (
            <div key={c.key} className="card">
              <div className="font-serif text-lg font-semibold text-forest-800">{c.title}</div>
              <p className="mt-1 text-xs text-charcoal-500">{c.topics.slice(0, 4).join(" · ")}</p>
              {c.sensitive && <span className="badge mt-2 bg-gold-100 text-gold-700">Confidential</span>}
            </div>
          ))}
        </div>
      </section>

      <section className="container-p mt-16">
        <div className="flex items-end justify-between">
          <h2 className="text-3xl font-semibold">Our practitioners</h2>
          <Link href="/doctors" className="text-sm text-forest-700 hover:underline">All doctors →</Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {doctors.map((d) => (
            <Link key={d.id} href={`/doctors/${d.slug}`} className="card hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-forest-100 font-serif text-xl text-forest-800">{d.user.name.replace(/^Dr\.?\s*/, "").split(" ").map((w) => w[0]).join("")}</div>
                <div>
                  <div className="font-serif text-lg font-semibold">{d.user.name}</div>
                  <div className="text-xs text-charcoal-500">{d.specialisations.split(",").slice(0, 3).join(" · ")}</div>
                </div>
              </div>
              <div className="mt-3 text-sm">Consultation from <b>{inr(d.fee)}</b></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-p mt-16">
        <div className="flex items-end justify-between">
          <h2 className="text-3xl font-semibold">From the PARMSUKH store</h2>
          <Link href="/store" className="text-sm text-forest-700 hover:underline">Visit store →</Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {products.slice(0, 4).map((p) => <ProductCard key={p.id} p={p} inStock={p.stock > 0} />)}
        </div>
      </section>
    </>
  );
}
