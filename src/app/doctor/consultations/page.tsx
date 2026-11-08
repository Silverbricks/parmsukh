import Link from "next/link";
import { db } from "@/lib/db";
import { requireDoctor } from "@/lib/auth";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { fmtDateTime, label } from "@/lib/format";
import { SYSTEMS } from "@/lib/constants";

export default async function DoctorConsultations({ searchParams }: { searchParams: Promise<{ status?: string; system?: string }> }) {
  const sp = await searchParams;
  const { doctor } = await requireDoctor();
  const list = await db.consultation.findMany({
    where: { doctorId: doctor.id, ...(sp.status ? { status: sp.status } : {}), ...(sp.system ? { system: sp.system } : {}) },
    include: { patient: true }, orderBy: { createdAt: "desc" }, take: 200,
  });
  const f = (k: string, v: string) => { const p = new URLSearchParams(sp as Record<string, string>); if (v) p.set(k, v); else p.delete(k); return `/doctor/consultations?${p}`; };
  return (
    <div className="space-y-6">
      <PageHeader title="Consultations" actions={<>
        <Link href={f("status", "")} className={!sp.status ? "btn-primary" : "btn-outline"}>All</Link>
        <Link href={f("status", "IN_PROGRESS")} className={sp.status === "IN_PROGRESS" ? "btn-primary" : "btn-outline"}>In progress</Link>
        <Link href={f("status", "COMPLETED")} className={sp.status === "COMPLETED" ? "btn-primary" : "btn-outline"}>Completed</Link>
        {Object.entries(SYSTEMS).map(([k, v]) => <Link key={k} href={f("system", sp.system === k ? "" : k)} className={sp.system === k ? "btn-gold" : "btn-ghost"}>{v}</Link>)}
      </>} />
      <div className="card overflow-x-auto">
        {list.length ? (
          <table className="table">
            <thead><tr><th>No.</th><th>Started</th><th>Patient</th><th>Therapy</th><th>Complaint</th><th>Progress</th><th>Status</th><th /></tr></thead>
            <tbody>{list.map((c) => (
              <tr key={c.id}>
                <td className="font-mono text-xs">{c.number}</td><td>{fmtDateTime(c.createdAt)}</td>
                <td>{c.patient.firstName} {c.patient.lastName}<div className="text-xs text-charcoal-500">{c.patient.patientCode}</div></td>
                <td>{SYSTEMS[c.system as keyof typeof SYSTEMS]}</td><td className="max-w-xs text-xs">{c.mainComplaint}</td>
                <td className="text-xs">{label(c.progressStatus)}</td>
                <td><Badge s={c.status} />{c.status === "COMPLETED" && !c.summaryApproved && <div className="text-[11px] text-gold-700">summary not released</div>}</td>
                <td><Link className="text-forest-700 underline" href={`/doctor/consultations/${c.id}`}>Open</Link></td>
              </tr>
            ))}</tbody>
          </table>
        ) : <Empty>No consultations.</Empty>}
      </div>
    </div>
  );
}
