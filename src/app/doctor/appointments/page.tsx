import Link from "next/link";
import { db } from "@/lib/db";
import { requireDoctor } from "@/lib/auth";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { startConsultation, updateAppointment } from "@/app/actions/doctor";
import { addDays, fmtDate, inr, istNow } from "@/lib/format";
import { MODES, SERVICES, SYSTEMS } from "@/lib/constants";

export default async function DoctorAppointments({ searchParams }: { searchParams: Promise<{ date?: string; view?: string; status?: string }> }) {
  const sp = await searchParams;
  const { doctor } = await requireDoctor();
  const today = istNow().date;
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today;
  const view = sp.view === "week" ? "week" : sp.view === "month" ? "month" : "day";
  const end = view === "day" ? date : addDays(date, view === "week" ? 6 : 30);
  const appts = await db.appointment.findMany({
    where: { doctorId: doctor.id, ...(sp.status ? { status: sp.status } : { date: { gte: date, lte: end } }) },
    include: { patient: true, consultation: true }, orderBy: [{ date: "asc" }, { time: "asc" }],
  });
  const link = (d: string, v = view) => `/doctor/appointments?date=${d}&view=${v}`;
  const step = view === "day" ? 1 : view === "week" ? 7 : 30;
  return (
    <div className="space-y-6">
      <PageHeader title="Appointments" sub={sp.status ? `Status: ${sp.status}` : view === "day" ? fmtDate(date) : `${fmtDate(date)} – ${fmtDate(end)}`}
        actions={<>
          <Link href={link(addDays(date, -step))} className="btn-ghost">← Prev</Link>
          <Link href={link(today)} className="btn-outline">Today</Link>
          <Link href={link(addDays(date, step))} className="btn-ghost">Next →</Link>
          {(["day", "week", "month"] as const).map((v) => <Link key={v} href={link(date, v)} className={view === v ? "btn-primary" : "btn-outline"}>{v[0].toUpperCase() + v.slice(1)}</Link>)}
        </>} />
      <div className="card overflow-x-auto">
        {appts.length ? (
          <table className="table">
            <thead><tr><th>When</th><th>Patient</th><th>Consultation</th><th>Concern</th><th>Payment</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{appts.map((a) => (
              <tr key={a.id}>
                <td className="whitespace-nowrap">{fmtDate(a.date)}<br /><b>{a.time}</b><div className="text-xs text-charcoal-500">{a.ref}</div></td>
                <td>{a.patient ? <Link className="text-forest-700 underline" href={`/doctor/patients/${a.patient.id}`}>{a.patient.firstName} {a.patient.lastName}</Link> : <>{a.guestName} <span className="text-xs text-charcoal-500">(guest · {a.guestMobile})</span></>}</td>
                <td>{SYSTEMS[a.system as keyof typeof SYSTEMS]}<div className="text-xs text-charcoal-500">{SERVICES[a.service as keyof typeof SERVICES]} · {MODES[a.mode as keyof typeof MODES]}</div></td>
                <td className="max-w-xs text-xs">{a.concern}</td>
                <td className="text-xs">{inr(a.fee - a.discount)}<br /><Badge s={a.paymentStatus} /></td>
                <td><Badge s={a.status} /></td>
                <td className="space-y-1">
                  {a.consultation ? <Link href={`/doctor/consultations/${a.consultation.id}`} className="btn-outline btn-sm">Open consultation</Link>
                    : ["CONFIRMED", "REQUESTED"].includes(a.status) && (
                      <div className="flex flex-wrap gap-1">
                        <form action={startConsultation}><input type="hidden" name="appointmentId" value={a.id} /><button className="btn-primary btn-sm">Start</button></form>
                        {a.status === "REQUESTED" && <form action={updateAppointment}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="op" value="confirm" /><button className="btn-outline btn-sm">Confirm</button></form>}
                        <form action={updateAppointment}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="op" value="no_show" /><button className="btn-ghost btn-sm">No-show</button></form>
                      </div>
                    )}
                  {a.mode === "ONLINE" && !["CANCELLED", "COMPLETED"].includes(a.status) && (
                    <form action={updateAppointment} className="flex gap-1">
                      <input type="hidden" name="id" value={a.id} /><input type="hidden" name="op" value="video" />
                      <input className="input py-1 text-xs" name="videoLink" defaultValue={a.videoLink ?? ""} placeholder="https://meet…" />
                      <button className="btn-ghost btn-sm">Save link</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}</tbody>
          </table>
        ) : <Empty>No appointments in this period.</Empty>}
      </div>
    </div>
  );
}
