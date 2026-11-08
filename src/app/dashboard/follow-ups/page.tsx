import Link from "next/link";
import { db } from "@/lib/db";
import { requirePatient } from "@/lib/auth";
import { ActionForm } from "@/components/action-form";
import { Area, Badge, Empty, PageHeader, Select } from "@/components/ui";
import { submitFollowUpReport } from "@/app/actions/patient";
import { fmtDate, fmtDateTime, label } from "@/lib/format";

export default async function MyFollowUps() {
  const { patient } = await requirePatient();
  const items = await db.followUp.findMany({ where: { patientId: patient.id }, include: { consultation: { include: { doctor: { include: { user: true } } } } }, orderBy: { dueDate: "desc" } });
  return (
    <div className="space-y-6">
      <PageHeader title="My Follow-ups" sub="Let your practitioner know how you are progressing." actions={<Link href="/book-consultation?service=FOLLOW_UP" className="btn-primary">Book follow-up</Link>} />
      {!items.length && <Empty>No follow-ups scheduled.</Empty>}
      {items.map((f) => (
        <div key={f.id} className="card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-medium">Follow-up due {fmtDate(f.dueDate)}</div>
              <div className="text-xs text-charcoal-500">{f.consultation ? `After consultation ${f.consultation.number} with ${f.consultation.doctor.user.name}` : ""}</div>
            </div>
            <Badge s={f.status} />
          </div>
          {f.reportedAt ? (
            <div className="mt-3 rounded-lg bg-ivory-100 p-3 text-sm">
              <div className="text-xs text-charcoal-500">You reported on {fmtDateTime(f.reportedAt)} · {label(f.improvement)}</div>
              <p>{f.patientReport}</p>
              {f.newSymptoms && <p><b>New symptoms:</b> {f.newSymptoms}</p>}
              {f.adverseEvents && <p><b>Side effects:</b> {f.adverseEvents}</p>}
            </div>
          ) : (
            <ActionForm action={submitFollowUpReport} submit="Send progress update" className="mt-4 grid gap-4 md:grid-cols-2">
              <input type="hidden" name="followUpId" value={f.id} />
              <Select label="How are you feeling overall?" name="improvement" required options={[["IMPROVED", "Improved"], ["NO_CHANGE", "No significant change"], ["WORSENED", "Worsened"], ["RESOLVED", "Resolved"]]} />
              <div />
              <Area label="Describe your progress" name="patientReport" />
              <Area label="Any new symptoms?" name="newSymptoms" />
              <Area label="Any side effects or reactions?" name="adverseEvents" className="md:col-span-2" />
            </ActionForm>
          )}
        </div>
      ))}
    </div>
  );
}
