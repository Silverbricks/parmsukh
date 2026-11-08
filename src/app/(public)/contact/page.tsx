import { db } from "@/lib/db";
import { CLINIC } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contact" };

export default async function Contact() {
  const settings = Object.fromEntries((await db.clinicSetting.findMany()).map((s) => [s.key, s.value]));
  return (
    <div className="container-p max-w-3xl py-12">
      <h1 className="text-4xl font-semibold">Contact us</h1>
      <div className="card mt-6 space-y-2 text-sm">
        <div><b>{settings.clinic_name ?? CLINIC.name}</b></div>
        <div>{settings.clinic_address ?? CLINIC.address}</div>
        {settings.clinic_phone && <div>Phone: {settings.clinic_phone}</div>}
        <div>Email: {settings.clinic_email ?? CLINIC.email}</div>
        <div>Hours: {settings.opening_hours}</div>
      </div>
      <p className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        For medical emergencies call <b>112</b>. PARMSUKH is not an emergency service.
      </p>
    </div>
  );
}
