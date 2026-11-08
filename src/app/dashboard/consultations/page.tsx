import Link from "next/link";
import { db } from "@/lib/db";
import { requirePatient } from "@/lib/auth";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { cancelMyAppointment } from "@/app/actions/patient";
import { fmtDate, inr, istNow } from "@/lib/format";
import { MODES, SERVICES, SYSTEMS } from "@/lib/constants";

export default async function MyConsultations() {
  const { patient } = await requirePatient();
  const today = istNow().date;
  const appts = await db.appointment.findMany({
    where: { patientId: patient.id }, include: { doctor: { include: { user: true } }, consultation: true },
    orderBy: [{ date: "desc" }, { time: "desc" }],
  });
  const upcoming = appts.filter((a) => a.date >= today && ["CONFIRMED", "REQUESTED"].includes(a.status)).reverse();
  const past = appts.filter((a) => !upcoming.includes(a));
  const walkIns = await db.consultation.findMany({ where: { patientId: patient.id, appointmentId: null, status: "COMPLETED" }, include: { doctor: { include: { user: true } } }, orderBy: { completedAt: "desc" } });

  return (
    <div className="space-y-6">
      <PageHeader title="My Consultations" actions={<Link href="/book-consultation" className="btn-primary">Book new consultation</Link>} />
      <section className="card">
        <h2 className="section-title">Upcoming</h2>
        {upcoming.length ? (
          <div className="mt-3 overflow-x-auto"><table className="table">
            <thead><tr><th>Date</th><th>Doctor</th><th>Type</th><th>Fee</th><th>Status</th><th /></tr></thead>
            <tbody>{upcoming.map((a) => (
              <tr key={a.id}>
                <td>{fmtDate(a.date)} {a.time}<div className="text-xs text-charcoal-500">{a.ref}</div></td>
                <td>{a.doctor.user.name}</td>
                <td>{SYSTEMS[a.system as keyof typeof SYSTEMS]} · {SERVICES[a.service as keyof typeof SERVICES]}<div className="text-xs text-charcoal-500">{MODES[a.mode as keyof typeof MODES]}</div></td>
                <td>{inr(a.fee - a.discount)} <Badge s={a.paymentStatus} /></td>
                <td><Badge s={a.status} /></td>
                <td className="space-x-2 whitespace-nowrap">
                  {a.mode === "ONLINE" && a.videoLink && <a href={a.videoLink} target="_blank" rel="noreferrer" className="btn-outline btn-sm">Join</a>}
                  <form action={cancelMyAppointment} className="inline"><input type="hidden" name="id" value={a.id} /><button className="btn-ghost btn-sm text-red-700">Cancel</button></form>
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <div className="mt-3"><Empty>No upcoming consultations.</Empty></div>}
        <p className="mt-3 text-xs text-charcoal-500">To reschedule, cancel and book a new slot. Online payments for cancelled bookings are refunded per clinic policy.</p>
      </section>
      <section className="card">
        <h2 className="section-title">Past consultations</h2>
        <div className="mt-3 overflow-x-auto"><table className="table">
          <thead><tr><th>Date</th><th>Doctor</th><th>Type</th><th>Status</th><th>Summary</th></tr></thead>
          <tbody>
            {past.map((a) => (
              <tr key={a.id}>
                <td>{fmtDate(a.date)} {a.time}</td><td>{a.doctor.user.name}</td>
                <td>{SYSTEMS[a.system as keyof typeof SYSTEMS]} · {MODES[a.mode as keyof typeof MODES]}</td>
                <td><Badge s={a.status} /></td>
                <td>{a.consultation?.summaryApproved ? <Link className="text-forest-700 underline" href={`/dashboard/consultations/${a.consultation.id}`}>View</Link> : <span className="text-xs text-charcoal-500">—</span>}</td>
              </tr>
            ))}
            {walkIns.map((c) => (
              <tr key={c.id}>
                <td>{fmtDate(c.completedAt)}</td><td>{c.doctor.user.name}</td><td>{SYSTEMS[c.system as keyof typeof SYSTEMS]} · {MODES[c.mode as keyof typeof MODES]}</td>
                <td><Badge s="COMPLETED" /></td>
                <td>{c.summaryApproved ? <Link className="text-forest-700 underline" href={`/dashboard/consultations/${c.id}`}>View</Link> : "—"}</td>
              </tr>
            ))}
            {!past.length && !walkIns.length && <tr><td colSpan={5} className="text-charcoal-500">No past consultations.</td></tr>}
          </tbody>
        </table></div>
      </section>
    </div>
  );
}
