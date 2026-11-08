import Link from "next/link";
import { db } from "@/lib/db";
import { requirePatient } from "@/lib/auth";
import { Badge, Empty, Notice, PageHeader, Stat } from "@/components/ui";
import { fmtDate, fmtDateTime, inr, istNow } from "@/lib/format";
import { MODES } from "@/lib/constants";

export default async function PatientHome({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  const { session, patient } = await requirePatient();
  const today = istNow().date;
  const [upcoming, latest, followUps, orders, notifications, pendingPay] = await Promise.all([
    db.appointment.findMany({ where: { patientId: patient.id, date: { gte: today }, status: { in: ["CONFIRMED", "REQUESTED"] } }, include: { doctor: { include: { user: true } } }, orderBy: [{ date: "asc" }, { time: "asc" }], take: 3 }),
    db.consultation.findFirst({ where: { patientId: patient.id, status: "COMPLETED", summaryApproved: true }, include: { doctor: { include: { user: true } } }, orderBy: { completedAt: "desc" } }),
    db.followUp.findMany({ where: { patientId: patient.id, status: "DUE" }, orderBy: { dueDate: "asc" }, take: 3 }),
    db.order.findMany({ where: { userId: session.uid }, orderBy: { createdAt: "desc" }, take: 3 }),
    db.notification.findMany({ where: { mobile: patient.mobile, channel: "SMS", subject: { not: "OTP" } }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.appointment.count({ where: { patientId: patient.id, paymentStatus: "PENDING", status: { in: ["CONFIRMED", "COMPLETED"] } } }),
  ]);
  const next = upcoming[0];
  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome, ${patient.firstName}`} sub={`Patient ID ${patient.patientCode}`}
        actions={<><Link href="/book-consultation" className="btn-primary">Book consultation</Link><Link href="/dashboard/case-history/new" className="btn-outline">Add health concern</Link><Link href="/store" className="btn-ghost">Shop</Link></>} />
      {welcome && <Notice tone="ok">Your account is ready. Start by completing <Link href="/dashboard/case-history" className="underline">your case history</Link> – it helps your practitioner prepare for your consultation.</Notice>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Upcoming consultations" value={upcoming.length} href="/dashboard/consultations" />
        <Stat label="Follow-ups due" value={followUps.length} href="/dashboard/follow-ups" tone="gold" />
        <Stat label="Pending payments" value={pendingPay} href="/dashboard/consultations" tone={pendingPay ? "red" : "forest"} />
        <Stat label="Recent orders" value={orders.length} href="/dashboard/orders" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="section-title">Upcoming consultation</h2>
          {next ? (
            <div className="mt-3 text-sm">
              <div className="font-serif text-2xl text-forest-800">{fmtDate(next.date)} · {next.time}</div>
              <div>{next.doctor.user.name} · {MODES[next.mode as keyof typeof MODES]}</div>
              <div className="mt-1 text-xs text-charcoal-500">Ref {next.ref}</div>
              {next.mode === "ONLINE" && <div className="mt-2 text-xs">{next.videoLink ? <a className="underline" href={next.videoLink} target="_blank" rel="noreferrer">Join video consultation</a> : "Your video link will appear here before the consultation."}</div>}
            </div>
          ) : <div className="mt-3"><Empty>No upcoming consultations. <Link className="underline" href="/book-consultation">Book one</Link></Empty></div>}
        </section>
        <section className="card">
          <h2 className="section-title">Latest consultation</h2>
          {latest ? (
            <div className="mt-3 text-sm">
              <div>{fmtDateTime(latest.completedAt)} · {latest.doctor.user.name}</div>
              <p className="mt-2 line-clamp-3 text-charcoal-700">{latest.patientSummary}</p>
              <Link href={`/dashboard/consultations/${latest.id}`} className="mt-2 inline-block text-forest-700 underline">View summary</Link>
            </div>
          ) : <div className="mt-3"><Empty>No consultation summaries yet.</Empty></div>}
        </section>
        <section className="card">
          <h2 className="section-title">Follow-up reminders</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {followUps.map((f) => <li key={f.id} className="flex justify-between"><span>Due {fmtDate(f.dueDate)}</span><Link href="/dashboard/follow-ups" className="text-forest-700 underline">Update progress</Link></li>)}
            {!followUps.length && <li className="text-charcoal-500">Nothing due.</li>}
          </ul>
        </section>
        <section className="card">
          <h2 className="section-title">Recent orders</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {orders.map((o) => <li key={o.id} className="flex items-center justify-between"><span>{o.number} · {inr(o.total)}</span><Badge s={o.status} /></li>)}
            {!orders.length && <li className="text-charcoal-500">No orders yet.</li>}
          </ul>
        </section>
      </div>
      <section className="card">
        <h2 className="section-title">Notifications</h2>
        <ul className="mt-3 divide-y divide-ivory-100 text-sm">
          {notifications.map((n) => <li key={n.id} className="py-2"><span className="text-xs text-charcoal-500">{fmtDateTime(n.createdAt)}</span><br />{n.message}</li>)}
          {!notifications.length && <li className="text-charcoal-500">No notifications.</li>}
        </ul>
      </section>
    </div>
  );
}
