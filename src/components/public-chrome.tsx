import Link from "next/link";
import { getSession } from "@/lib/auth";
import { CLINIC } from "@/lib/constants";
import { Logo } from "./brand";
import { CartCount } from "./cart";

const NAV = [
  ["/", "Home"], ["/about", "About"], ["/doctors", "Our Doctors"], ["/ayurveda", "Ayurveda"],
  ["/homoeopathy", "Homoeopathy"], ["/store", "Medicines & Products"], ["/contact", "Contact"],
];

export async function PublicHeader() {
  const s = await getSession();
  const portal = !s ? null : s.role === "PATIENT" ? ["/dashboard", "My Dashboard"] : s.role === "DOCTOR" ? ["/doctor", "Doctor Panel"] : ["/admin", "Admin Panel"];
  return (
    <header className="sticky top-0 z-30 border-b border-ivory-200 bg-ivory-50/95 backdrop-blur">
      <div className="hidden bg-forest-800 py-1.5 text-center text-xs tracking-wide text-gold-300 sm:block">
        {CLINIC.tagline} &nbsp;·&nbsp; {CLINIC.address}
      </div>
      <div className="container-p flex items-center justify-between gap-2 py-3 sm:gap-4">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map(([href, t]) => (
            <Link key={href} href={href} className="rounded-md px-3 py-2 text-sm text-charcoal-700 hover:bg-forest-50 hover:text-forest-800">{t}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/cart" className="btn-ghost px-2 sm:px-4" aria-label="Cart">Cart<CartCount /></Link>
          {portal ? <Link href={portal[0]} className="btn-outline hidden sm:inline-flex">{portal[1]}</Link>
            : <Link href="/login" className="btn-outline hidden sm:inline-flex">Patient Login</Link>}
          <Link href="/book-consultation" className="btn-gold px-3 sm:px-4"><span className="sm:hidden">Book</span><span className="hidden sm:inline">Book Consultation</span></Link>
        </div>
      </div>
      <nav className="container-p flex gap-1 overflow-x-auto pb-2 lg:hidden">
        {NAV.map(([href, t]) => (
          <Link key={href} href={href} className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs text-charcoal-700 hover:bg-forest-50">{t}</Link>
        ))}
        {!portal && <Link href="/login" className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium text-forest-700">Login</Link>}
      </nav>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="mt-16 bg-forest-900 text-ivory-100">
      <div className="container-p grid gap-8 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo light />
          <p className="mt-4 max-w-md text-sm text-ivory-100/80">{CLINIC.tagline}</p>
          <p className="mt-2 text-sm text-ivory-100/80">{CLINIC.name}<br />{CLINIC.address}<br />Practitioner: {CLINIC.practitioner}</p>
        </div>
        <div className="text-sm">
          <div className="mb-2 font-semibold text-gold-300">Services</div>
          <ul className="space-y-1 text-ivory-100/80">
            <li><Link href="/book-consultation">Book a consultation</Link></li>
            <li><Link href="/store">Medicines & products</Link></li>
            <li><Link href="/track-order">Track your order</Link></li>
            <li><Link href="/register">Create patient account</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <div className="mb-2 font-semibold text-gold-300">Staff</div>
          <ul className="space-y-1 text-ivory-100/80">
            <li><Link href="/staff-login">Doctor / staff login</Link></li>
            <li><Link href="/privacy">Privacy policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-forest-700 py-4">
        <p className="container-p text-xs leading-relaxed text-ivory-100/60">
          PARMSUKH supports complementary-health consultation and wellness education. It does not independently diagnose or guarantee treatment outcomes.
          Complementary therapies must not delay necessary medical treatment. In an emergency call <b>112</b>.
        </p>
      </div>
    </footer>
  );
}
