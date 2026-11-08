import Link from "next/link";
import { db } from "@/lib/db";
import { requireDoctor } from "@/lib/auth";
import { Empty, PageHeader } from "@/components/ui";
import { age, fmtDate } from "@/lib/format";
import { COMPLAINT_CATEGORIES } from "@/lib/constants";

export default async function PatientDirectory({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; mine?: string }> }) {
  const sp = await searchParams;
  const { session, doctor } = await requireDoctor();
  const q = sp.q?.trim().slice(0, 60);
  const mineOnly = sp.mine !== "0";
  const patients = await db.patient.findMany({
    where: {
      ...(q ? { OR: [{ patientCode: { contains: q } }, { firstName: { contains: q } }, { lastName: { contains: q } }, { mobile: { contains: q } }, { email: { contains: q } }, { dob: q }] } : {}),
      ...(sp.category ? { complaints: { some: { category: sp.category } } } : {}),
      ...(mineOnly && !q ? { OR: [{ consultations: { some: { doctorId: doctor.id } } }, { appointments: { some: { doctorId: doctor.id } } }, { createdById: session.uid }] } : {}),
    },
    include: { consultations: { where: { doctorId: doctor.id }, orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { updatedAt: "desc" }, take: 100,
  });
  return (
    <div className="space-y-6">
      <PageHeader title="Patients" sub="Search by Patient ID, name, mobile, email or date of birth (YYYY-MM-DD)." actions={<Link href="/doctor/patients/new" className="btn-primary">Register patient</Link>} />
      <form className="card flex flex-wrap gap-3">
        <input className="input max-w-sm" name="q" defaultValue={q} placeholder="PAR-000001, name or mobile…" />
        <select className="input max-w-xs" name="category" defaultValue={sp.category ?? ""}>
          <option value="">All health categories</option>
          {COMPLAINT_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.title}</option>)}
        </select>
        <select className="input max-w-xs" name="mine" defaultValue={mineOnly ? "1" : "0"}>
          <option value="1">My patients</option><option value="0">Whole directory</option>
        </select>
        <button className="btn-primary">Search</button>
      </form>
      <div className="card overflow-x-auto">
        {patients.length ? (
          <table className="table">
            <thead><tr><th>Patient ID</th><th>Name</th><th>Age</th><th>Mobile</th><th>City</th><th>Last seen by you</th><th /></tr></thead>
            <tbody>{patients.map((p) => (
              <tr key={p.id}>
                <td className="font-mono text-xs">{p.patientCode}</td><td>{p.firstName} {p.lastName}</td><td>{age(p.dob) ?? "—"}</td>
                <td>{p.mobile}</td><td>{p.city ?? "—"}</td><td>{p.consultations[0] ? fmtDate(p.consultations[0].createdAt) : "—"}</td>
                <td><Link href={`/doctor/patients/${p.id}`} className="text-forest-700 underline">Open</Link></td>
              </tr>
            ))}</tbody>
          </table>
        ) : <Empty>No patients found.</Empty>}
      </div>
    </div>
  );
}
