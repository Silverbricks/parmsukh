import Link from "next/link";
import { db } from "@/lib/db";
import { requireDoctor } from "@/lib/auth";
import { Badge, Empty, PageHeader, Stat } from "@/components/ui";
import { addDays, fmtDate, fmtDateTime, istNow, parseJson } from "@/lib/format";
import { MODES, SYSTEMS } from "@/lib/constants";
import { startConsultation } from "@/app/actions/doctor";

export default async function DoctorDashboard() {
  const { session, doctor } = await requireDoctor();
  const today = istNow().date;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [todays, pending, inProgress, followUps, completedMonth, flagged, recentViews, myPatientIds] = await Promise.all([
    db.appointment.findMany({ where: { doctorId: doctor.id, date: today, status: { in: ["CONFIRMED", "REQUESTED", "COMPLETED"] } }, include: { patient: true, consultation: true }, orderBy: { time: "asc" } }),
    db.appointment.count({ where: { doctorId: doctor.id, status: "REQUESTED" } }),
    db.consultation.findMany({ where: { doctorId: doctor.id, status: "IN_PROGRESS" }, include: { patient: true }, orderBy: { createdAt: "desc" } }),
    db.followUp.findMany({ where: { status: "DUE", dueDate: { lte: addDays(today, 7) }, consultation: { doctorId: doctor.id } }, include: { patient: true }, orderBy: { dueDate: "asc" }, take: 10 }),
    db.consultation.count({ where: { doctorId: doctor.id, status: "COMPLETED", completedAt: { gte: monthStart } } }),
    db.consultation.findMany({ where: { doctorId: doctor.id, NOT: { safetyFlags: "[]" }, referralOutcome: null }, include: { patient: true }, orderBy: { createdAt: "desc" }, take: 10 }),
    db.auditLog.findMany({ where: { userId: session.uid, action: "CLINICAL_RECORD_VIEW" }, orderBy: { createdAt: "desc" }, take: 30 }),
    db.consultation.groupBy({ by: ["patientId"], where: { doctorId: doctor.id }, _min: { createdAt: true } }),
  ]);
  const newPatients = myPatientIds.filter((p) => p._min.createdAt && p._min.createdAt >= monthStart).length;
  const recentIds = [...new Set(recentViews.map((r) => r.entityId!))].slice(0, 6);
  const recent = await db.patient.findMany({ where: { id: { in: recentIds } } });
  const reports = await db.followUp.count({ where: { reportedAt: { not: null }, status: "DUE", consultation: { doctorId: doctor.id } } });

  return (
    <div className="space-y-6">
      <PageHeader title={`Good day, ${session.name}`} sub={`${fmtDate(today)} · ${doctor.code}`}
        actions={<><Link href="/doctor/patients/new" className="btn-outline">Register patient</Link><Link href="/doctor/patients" className="btn-primary">Start consultation</Link></>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Stat label="Today's appointments" value={todays.length} href="/doctor/appointments" />
        <Stat label="Pending requests" value={pending} href="/doctor/appointments?status=REQUESTED" tone="gold" />
        <Stat label="Incomplete documentation" value={inProgress.length} href="/doctor/consultations?status=IN_PROGRESS" tone={inProgress.length ? "red" : "forest"} />
        <Stat label="Follow-ups due (7 days)" value={followUps.length} tone="gold" />
        <Stat label="New patients this month" value={newPatients} />
        <Stat label="Completed this month" value={completedMonth} href="/doctor/consultations" />
      </div>

      {flagged.length > 0 && (
        <section className="card border-red-200">
          <h2 className="section-title text-red-800">Referrals requiring review</h2>
          <ul className="mt-3 divide-y divide-ivory-100 text-sm">
            {flagged.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>{c.patient.firstName} {c.patient.lastName} · {c.number} · {parseJson<string[]>(c.safetyFlags, []).join(", ")}</span>
                <Link href={`/doctor/consultations/${c.id}`} className="text-forest-700 underline">Record outcome</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="section-title">Today's appointments</h2>
          {todays.length ? (
            <ul className="mt-3 divide-y divide-ivory-100">
              {todays.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <div>
                    <b>{a.time}</b> · {a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : `${a.guestName} (guest)`}
                    <div className="text-xs text-charcoal-500">{SYSTEMS[a.system as keyof typeof SYSTEMS]} · {MODES[a.mode as keyof typeof MODES]}{a.concern ? ` · ${a.concern.slice(0, 60)}` : ""}</div>
                  </div>
                  {a.consultation ? <Link href={`/doctor/consultations/${a.consultation.id}`} className="btn-outline btn-sm">{a.consultation.status === "COMPLETED" ? "View" : "Continue"}</Link>
                    : <form action={startConsultation}><input type="hidden" name="appointmentId" value={a.id} /><button className="btn-primary btn-sm">Start</button></form>}
                </li>
              ))}
            </ul>
          ) : <div className="mt-3"><Empty>No appointments today.</Empty></div>}
        </section>
        <section className="card">
          <h2 className="section-title">Pending documentation</h2>
          <ul className="mt-3 divide-y divide-ivory-100 text-sm">
            {inProgress.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2">
                <span>{c.number} · {c.patient.firstName} {c.patient.lastName}<span className="block text-xs text-charcoal-500">Started {fmtDateTime(c.createdAt)}</span></span>
                <Link href={`/doctor/consultations/${c.id}`} className="text-forest-700 underline">Continue</Link>
              </li>
            ))}
            {!inProgress.length && <li className="py-2 text-charcoal-500">All consultations documented.</li>}
          </ul>
        </section>
        <section className="card">
          <h2 className="section-title">Follow-ups</h2>
          {reports > 0 && <p className="mt-1 text-xs text-gold-700">{reports} patient progress update(s) awaiting review.</p>}
          <ul className="mt-3 divide-y divide-ivory-100 text-sm">
            {followUps.map((f) => (
              <li key={f.id} className="flex items-center justify-between py-2">
                <span>{f.patient.firstName} {f.patient.lastName} · due {fmtDate(f.dueDate)} {f.reportedAt && <Badge s="PENDING" text="Update received" />}</span>
                <Link href={`/doctor/patients/${f.patientId}`} className="text-forest-700 underline">Open</Link>
              </li>
            ))}
            {!followUps.length && <li className="py-2 text-charcoal-500">None due this week.</li>}
          </ul>
        </section>
        <section className="card">
          <h2 className="section-title">Recently accessed patients</h2>
          <ul className="mt-3 divide-y divide-ivory-100 text-sm">
            {recentIds.map((id) => recent.find((p) => p.id === id)).filter(Boolean).map((p) => (
              <li key={p!.id} className="flex justify-between py-2"><span>{p!.firstName} {p!.lastName} · {p!.patientCode}</span><Link href={`/doctor/patients/${p!.id}`} className="text-forest-700 underline">Open</Link></li>
            ))}
            {!recentIds.length && <li className="py-2 text-charcoal-500">No recent records.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
