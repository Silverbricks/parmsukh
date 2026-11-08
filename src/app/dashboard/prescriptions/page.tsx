import Link from "next/link";
import { db } from "@/lib/db";
import { requirePatient } from "@/lib/auth";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { fmtDate, fmtDateTime, istNow } from "@/lib/format";

export default async function MyPrescriptions() {
  const { patient } = await requirePatient();
  const rxs = await db.prescription.findMany({
    where: { patientId: patient.id, approved: true },
    include: { items: { include: { product: true } }, doctor: { include: { user: true } } }, orderBy: { approvedAt: "desc" },
  });
  const today = istNow().date;
  return (
    <div className="space-y-6">
      <PageHeader title="My Prescriptions & Medicines" sub="Practitioner-approved prescriptions and wellness recommendations." />
      {!rxs.length && <Empty>No approved prescriptions yet.</Empty>}
      {rxs.map((rx) => (
        <div key={rx.id} className="card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-serif text-xl font-semibold">{rx.kind === "CLINICAL_PRESCRIPTION" ? "℞ Clinical prescription" : "Wellness recommendation"} · {rx.number}</div>
              <div className="text-xs text-charcoal-500">{rx.doctor.user.name} · {fmtDateTime(rx.approvedAt)}{rx.validUntil ? ` · Valid until ${fmtDate(rx.validUntil)}` : ""}</div>
            </div>
            <div className="flex gap-2">
              {rx.validUntil && rx.validUntil < today ? <Badge s="CANCELLED" text="Expired" /> : <Badge s="CONFIRMED" text="Active" />}
              <Link href={`/dashboard/consultations/${rx.consultationId}`} className="btn-outline btn-sm">Full summary</Link>
            </div>
          </div>
          <table className="table mt-3">
            <thead><tr><th>Medicine / product</th><th>Potency</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th /></tr></thead>
            <tbody>{rx.items.map((i) => (
              <tr key={i.id}>
                <td>{i.name}{i.notes && <div className="text-xs text-charcoal-500">{i.notes}</div>}</td><td>{i.potency}</td><td>{i.dosage}</td><td>{i.frequency}</td><td>{i.duration}</td>
                <td>{i.product?.active && <Link href={`/store/${i.product.slug}`} className="text-xs text-forest-700 underline">Buy</Link>}</td>
              </tr>
            ))}</tbody>
          </table>
          {rx.instructions && <p className="mt-2 text-sm"><b>Instructions:</b> {rx.instructions}</p>}
          {rx.precautions && <p className="mt-1 text-sm"><b>Precautions:</b> {rx.precautions}</p>}
        </div>
      ))}
    </div>
  );
}
