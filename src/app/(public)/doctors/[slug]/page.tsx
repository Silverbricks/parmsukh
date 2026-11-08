import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { inr } from "@/lib/format";
import { MODES, SYSTEMS, type SystemKey } from "@/lib/constants";

export const dynamic = "force-dynamic";
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function DoctorProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await db.doctor.findUnique({ where: { slug }, include: { user: true, availability: { orderBy: [{ weekday: "asc" }, { startTime: "asc" }] } } });
  if (!d || !d.active) notFound();
  const modes = [d.inPersonAvailable && MODES.IN_PERSON, d.onlineAvailable && MODES.ONLINE, d.phoneAvailable && MODES.PHONE].filter(Boolean);
  return (
    <div className="container-p grid gap-8 py-12 md:grid-cols-3">
      <div className="md:col-span-2">
        <h1 className="text-4xl font-semibold">{d.user.name}</h1>
        <p className="mt-1 text-charcoal-500">{d.systems.split(",").map((s) => SYSTEMS[s as SystemKey]).join(" · ")}</p>
        <p className="mt-6 whitespace-pre-line text-charcoal-700">{d.bio}</p>
        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-charcoal-500">Qualifications</dt><dd>{d.qualifications}</dd></div>
          <div><dt className="text-charcoal-500">Registration</dt><dd>{d.verified && d.registrationNo ? `${d.registrationNo} (${d.registrationBody ?? ""})` : "Verification pending"}</dd></div>
          <div><dt className="text-charcoal-500">Areas of interest</dt><dd>{d.specialisations.split(",").join(", ")}</dd></div>
          <div><dt className="text-charcoal-500">Languages</dt><dd>{d.languages}</dd></div>
          <div><dt className="text-charcoal-500">Location</dt><dd>{d.clinicLocation}</dd></div>
          <div><dt className="text-charcoal-500">Consultation modes</dt><dd>{modes.join(", ")}</dd></div>
        </dl>
      </div>
      <aside className="card h-fit">
        <div className="text-sm text-charcoal-500">Consultation fee</div>
        <div className="font-serif text-3xl font-semibold text-forest-800">{inr(d.fee)}</div>
        {d.followUpFee > 0 && <div className="text-sm">Follow-up: {inr(d.followUpFee)}</div>}
        <div className="mt-4 text-sm font-medium">Clinic hours</div>
        <ul className="mt-1 space-y-0.5 text-sm text-charcoal-700">
          {d.availability.map((a) => <li key={a.id}>{DAYS[a.weekday]}: {a.startTime}–{a.endTime}</li>)}
        </ul>
        <Link href={`/book-consultation?doctor=${d.id}`} className="btn-primary mt-5 w-full">Book with {d.user.name.split(" ").slice(0, 2).join(" ")}</Link>
      </aside>
    </div>
  );
}
