import Link from "next/link";
import { LoginForm } from "./form";

export const metadata = { title: "Patient Login" };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="container-p grid max-w-5xl gap-8 py-12 md:grid-cols-2">
      <div className="card">
        <h1 className="text-3xl font-semibold">Patient login</h1>
        <p className="mt-1 text-sm text-charcoal-500">Log in with your registered mobile number and a one-time password.</p>
        <div className="mt-6"><LoginForm next={next ?? ""} /></div>
        <p className="mt-6 text-sm">New to PARMSUKH? <Link href="/register" className="font-medium text-forest-700 hover:underline">Create a patient account</Link></p>
      </div>
      <div className="card bg-ivory-100">
        <h2 className="text-2xl font-semibold">Continue as guest</h2>
        <p className="mt-1 text-sm text-charcoal-700">You don't need an account to book a consultation or buy products. You can create an account later with the same mobile number and your bookings and orders will be linked automatically.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/book-consultation" className="btn-primary">Book consultation</Link>
          <Link href="/store" className="btn-outline">Shop as guest</Link>
          <Link href="/track-order" className="btn-ghost">Track an order</Link>
        </div>
        <p className="mt-6 text-xs text-charcoal-500">Doctor or staff member? <Link href="/staff-login" className="underline">Staff login</Link></p>
      </div>
    </div>
  );
}
