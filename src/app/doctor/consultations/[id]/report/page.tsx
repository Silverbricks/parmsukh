import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireDoctor } from "@/lib/auth";
import { ConsultationReport } from "@/components/consultation-report";
import { PrintButton } from "@/components/print-button";
import { Notice } from "@/components/ui";

export default async function DoctorReport({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { doctor } = await requireDoctor();
  const c = await db.consultation.findFirst({
    where: { id, doctorId: doctor.id },
    include: { patient: true, doctor: { include: { user: true } }, prescriptions: { where: { approved: true }, include: { items: true } } },
  });
  if (!c) notFound();
  return (
    <div className="space-y-4">
      <div className="no-print flex items-center justify-between">
        <Link href={`/doctor/consultations/${c.id}`} className="btn-ghost">← Back to workspace</Link>
        <PrintButton />
      </div>
      {!c.summaryApproved && <div className="no-print"><Notice tone="warn">Preview – the summary has not been approved for release to the patient yet. Only approved prescriptions are included.</Notice></div>}
      <ConsultationReport
        c={c}
        doctor={{ name: c.doctor.user.name, qualifications: c.doctor.qualifications, registrationNo: c.doctor.registrationNo, verified: c.doctor.verified }}
        patient={{ name: `${c.patient.firstName} ${c.patient.lastName}`.trim(), code: c.patient.patientCode, dob: c.patient.dob, sex: c.patient.sex, mobile: c.patient.mobile }}
        prescriptions={c.prescriptions}
      />
    </div>
  );
}
