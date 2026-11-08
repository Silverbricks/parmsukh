import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { Empty, PageHeader } from "@/components/ui";
import { age, fmtDate } from "@/lib/format";

// Administrative registry: demographics only. No clinical data is loaded here.
export default async function PatientRegistry({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const s = await requirePermission("patients:read");
  const term = q?.trim().slice(0, 60);
  const patients = await db.patient.findMany({
    where: term ? { OR: [{ patientCode: { contains: term } }, { firstName: { contains: term } }, { lastName: { contains: term } }, { mobile: { contains: term } }, { email: { contains: term } }] } : {},
    select: { id: true, patientCode: true, firstName: true, lastName: true, mobile: true, email: true, dob: true, city: true, createdAt: true, userId: true, _count: { select: { appointments: true } } },
    orderBy: { createdAt: "desc" }, take: 100,
  });
  if (term) await audit(s, "PATIENT_REGISTRY_SEARCH", "Patient", undefined, { term });
  return (
    <div className="space-y-6">
      <PageHeader title="Patient registry" sub="Administrative details only – clinical records are visible to treating practitioners." />
      <form className="card flex gap-2"><input className="input max-w-md" name="q" defaultValue={term} placeholder="Patient ID, name, mobile or email" /><button className="btn-primary">Search</button></form>
      <div className="card overflow-x-auto">
        {patients.length ? (
          <table className="table">
            <thead><tr><th>Patient ID</th><th>Name</th><th>Age</th><th>Mobile</th><th>Email</th><th>City</th><th>Portal</th><th>Bookings</th><th>Registered</th></tr></thead>
            <tbody>{patients.map((p) => (
              <tr key={p.id}><td className="font-mono text-xs">{p.patientCode}</td><td>{p.firstName} {p.lastName}</td><td>{age(p.dob) ?? "—"}</td><td>{p.mobile}</td><td>{p.email ?? "—"}</td><td>{p.city ?? "—"}</td><td>{p.userId ? "Yes" : "No"}</td><td>{p._count.appointments}</td><td>{fmtDate(p.createdAt)}</td></tr>
            ))}</tbody>
          </table>
        ) : <Empty>No patients found.</Empty>}
      </div>
    </div>
  );
}
