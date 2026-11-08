import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { adminAppointment } from "@/app/actions/admin";
import { addDays, fmtDate, inr, istNow, label } from "@/lib/format";
import { MODES, SYSTEMS } from "@/lib/constants";
import { ReceptionBooking, Reschedule } from "./client";

export default async function AdminAppointments({ searchParams }: { searchParams: Promise<{ date?: string; status?: string; doctor?: string }> }) {
  const sp = await searchParams;
  await requirePermission("appointments:manage");
  const today = istNow().date;
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today;
  const doctors = await db.doctor.findMany({ where: { active: true }, include: { user: true } });
  const appts = await db.appointment.findMany({
    where: { ...(sp.status ? { status: sp.status } : { date: { gte: date, lte: addDays(date, 6) } }), ...(sp.doctor ? { doctorId: sp.doctor } : {}) },
    include: { patient: { select: { firstName: true, lastName: true, patientCode: true, mobile: true } }, doctor: { include: { user: true } } },
    orderBy: [{ date: "asc" }, { time: "asc" }],
  });
  return (
    <div className="space-y-6">
      <PageHeader title="Appointments" sub={sp.status ? `Status ${label(sp.status)}` : `Week of ${fmtDate(date)}`}
        actions={<>
          <Link href={`/admin/appointments?date=${addDays(date, -7)}`} className="btn-ghost">← Prev week</Link>
          <Link href="/admin/appointments" className="btn-outline">This week</Link>
          <Link href={`/admin/appointments?date=${addDays(date, 7)}`} className="btn-ghost">Next week →</Link>
          <Link href="/admin/appointments?status=REQUESTED" className="btn-ghost">Requests</Link>
          <Link href="/admin/appointments?status=CANCELLED" className="btn-ghost">Cancelled</Link>
        </>} />
      <ReceptionBooking doctors={doctors.map((d) => ({ id: d.id, name: d.user.name }))} />
      <div className="card overflow-x-auto">
        {appts.length ? (
          <table className="table">
            <thead><tr><th>When</th><th>Ref</th><th>Patient</th><th>Doctor</th><th>Type</th><th>Payment</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{appts.map((a) => (
              <tr key={a.id}>
                <td className="whitespace-nowrap">{fmtDate(a.date)}<br /><b>{a.time}</b></td>
                <td className="font-mono text-xs">{a.ref}</td>
                <td>{a.patient ? <>{a.patient.firstName} {a.patient.lastName}<div className="text-xs text-charcoal-500">{a.patient.patientCode} · {a.patient.mobile}</div></> : <>{a.guestName}<div className="text-xs text-charcoal-500">Guest · {a.guestMobile}</div></>}</td>
                <td>{a.doctor.user.name}</td>
                <td className="text-xs">{SYSTEMS[a.system as keyof typeof SYSTEMS]}<br />{MODES[a.mode as keyof typeof MODES]}</td>
                <td className="text-xs">{inr(a.fee - a.discount)} · {label(a.paymentMethod)}<br /><Badge s={a.paymentStatus} /></td>
                <td><Badge s={a.status} /></td>
                <td>
                  <form action={adminAppointment} className="flex flex-wrap gap-1">
                    <input type="hidden" name="id" value={a.id} />
                    {a.status === "REQUESTED" && <button name="op" value="confirm" className="btn-primary btn-sm">Confirm</button>}
                    {a.paymentStatus === "PENDING" && a.status !== "CANCELLED" && <button name="op" value="paid" className="btn-outline btn-sm">Mark paid</button>}
                    {a.paymentStatus === "REFUND_REQUESTED" && <button name="op" value="refunded" className="btn-outline btn-sm">Mark refunded</button>}
                    {["CONFIRMED", "REQUESTED"].includes(a.status) && <><button name="op" value="no_show" className="btn-ghost btn-sm">No-show</button><button name="op" value="cancel" className="btn-ghost btn-sm text-red-700">Cancel</button></>}
                  </form>
                  {["CONFIRMED", "REQUESTED"].includes(a.status) && <Reschedule id={a.id} doctorId={a.doctorId} />}
                </td>
              </tr>
            ))}</tbody>
          </table>
        ) : <Empty>No appointments.</Empty>}
      </div>
    </div>
  );
}
