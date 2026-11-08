import Link from "next/link";
import { RegisterForm } from "./form";

export const metadata = { title: "Create Patient Account" };

export default function Register() {
  return (
    <div className="container-p max-w-2xl py-12">
      <div className="card">
        <h1 className="text-3xl font-semibold">Create your patient account</h1>
        <p className="mt-1 text-sm text-charcoal-500">Your Patient ID is generated automatically. If you have booked or ordered before as a guest with this mobile number, those records will be linked to your account.</p>
        <div className="mt-6"><RegisterForm /></div>
        <p className="mt-6 text-sm">Already registered? <Link href="/login" className="font-medium text-forest-700 hover:underline">Log in</Link></p>
      </div>
    </div>
  );
}
