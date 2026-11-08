import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePatient } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ConsultationReport } from "@/components/consultation-report";
import { PrintButton } from "@/components/print-button";

export default async function MyConsultationSummary({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, patient } = await requirePatient();
  // Only approved summaries of the patient's own consultations are visible.
  const c = await db.consultation.findFirst({
    where: { id, patientId: patient.id, status: "COMPLETED", summaryApproved: true },
    include: { doctor: { include: { user: true } }, prescriptions: { where: { approved: true }, include: { items: true } } },
  });
  if (!c) notFound();
  await audit(session, "PATIENT_VIEW_SUMMARY", "Consultation", c.id);
  return (
    <div>
      <div className="no-print mb-4 flex justify-end"><PrintButton /></div>
      <ConsultationReport
        c={c}
        doctor={{ name: c.doctor.user.name, qualifications: c.doctor.qualifications, registrationNo: c.doctor.registrationNo, verified: c.doctor.verified }}
        patient={{ name: `${patient.firstName} ${patient.lastName}`.trim(), code: patient.patientCode, dob: patient.dob, sex: patient.sex, mobile: patient.mobile }}
        prescriptions={c.prescriptions}
      />
    </div>
  );
}
