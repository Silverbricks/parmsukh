import Link from "next/link";
import { db } from "@/lib/db";
import { inr } from "@/lib/format";
import { SYSTEMS, type SystemKey } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "Our Doctors" };

export default async function Doctors() {
  const doctors = await db.doctor.findMany({ where: { active: true }, include: { user: true }, orderBy: { createdAt: "asc" } });
  return (
    <div className="container-p py-12">
      <h1 className="text-4xl font-semibold">Our Doctors</h1>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {doctors.map((d) => (
          <div key={d.id} className="card">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-forest-100 font-serif text-2xl text-forest-800">
                {d.user.name.replace(/^Dr\.?\s*/, "").split(" ").map((w) => w[0]).join("")}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-semibold">{d.user.name}</h2>
                <div className="text-sm text-charcoal-500">{d.systems.split(",").map((s) => SYSTEMS[s as SystemKey]).join(" · ")}</div>
                <div className="mt-1 text-xs text-charcoal-500">Languages: {d.languages}</div>
                {d.verified ? <span className="badge mt-2 bg-forest-100 text-forest-800">Credentials verified</span>
                  : <span className="badge mt-2 bg-ivory-200 text-charcoal-700">Credential verification pending</span>}
              </div>
            </div>
            <p className="mt-4 line-clamp-3 text-sm text-charcoal-700">{d.bio}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm">Fee <b>{inr(d.fee)}</b>{d.followUpFee ? <> · Follow-up {inr(d.followUpFee)}</> : null}</span>
              <div className="flex gap-2">
                <Link href={`/doctors/${d.slug}`} className="btn-outline btn-sm">Profile</Link>
                <Link href={`/book-consultation?doctor=${d.id}`} className="btn-primary btn-sm">Book</Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
