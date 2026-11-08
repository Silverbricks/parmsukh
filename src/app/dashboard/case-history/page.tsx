import Link from "next/link";
import { db } from "@/lib/db";
import { requirePatient } from "@/lib/auth";
import { ActionForm } from "@/components/action-form";
import { Area, Badge, Field, PageHeader, SafetyAlerts } from "@/components/ui";
import { saveMedicalHistory } from "@/app/actions/patient";
import { age, fmtDate, fmtDateTime, parseJson } from "@/lib/format";
import { categoryByKey, SYSTEMS, type SystemKey } from "@/lib/constants";

export default async function CaseHistory() {
  const { patient } = await requirePatient();
  const [mh, complaints, consultations, followUps] = await Promise.all([
    db.medicalHistory.findUnique({ where: { patientId: patient.id } }),
    db.healthComplaint.findMany({ where: { patientId: patient.id }, orderBy: { createdAt: "desc" } }),
    db.consultation.findMany({ where: { patientId: patient.id, status: "COMPLETED" }, include: { doctor: { include: { user: true } } }, orderBy: { completedAt: "desc" } }),
    db.followUp.findMany({ where: { patientId: patient.id, reportedAt: { not: null } }, orderBy: { reportedAt: "desc" } }),
  ]);

  type Ev = { at: Date; title: string; tag: string; body: React.ReactNode };
  const timeline: Ev[] = [
    { at: patient.createdAt, title: "Patient profile created", tag: "Registration", body: `Patient ID ${patient.patientCode}` },
    ...complaints.map((c) => ({ at: c.createdAt, title: c.title, tag: categoryByKey(c.category).title, body: c.symptoms })),
    ...consultations.map((c) => ({
      at: c.completedAt ?? c.createdAt, title: `${SYSTEMS[c.system as SystemKey]} consultation – ${c.doctor.user.name}`, tag: "Consultation",
      body: c.summaryApproved ? <Link className="underline" href={`/dashboard/consultations/${c.id}`}>View approved summary</Link> : "Summary awaiting practitioner approval",
    })),
    ...followUps.map((f) => ({ at: f.reportedAt!, title: "Progress update submitted", tag: "Follow-up", body: f.patientReport ?? "" })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <div className="space-y-6">
      <PageHeader title="My Case History" sub="Information you share here helps your practitioner. Clinical assessments and notes remain under practitioner control."
        actions={<Link href="/dashboard/case-history/new" className="btn-primary">Add health concern</Link>} />

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="card">
            <h2 className="section-title">Personal health information</h2>
            <p className="mb-4 text-xs text-charcoal-500">Age {age(patient.dob) ?? "—"} · DOB {fmtDate(patient.dob)} {mh && <>· Last updated {fmtDateTime(mh.updatedAt)}</>}</p>
            <ActionForm action={saveMedicalHistory}>
              <div className="grid gap-4 md:grid-cols-4">
                <Field label="Height (cm)" name="heightCm" type="number" step="0.1" defaultValue={mh?.heightCm} />
                <Field label="Weight (kg)" name="weightKg" type="number" step="0.1" defaultValue={mh?.weightKg} />
                <Field label="Stress level (1–10)" name="stressLevel" type="number" min={1} max={10} defaultValue={mh?.stressLevel} />
                <Field label="Water intake / day" name="waterIntake" defaultValue={mh?.waterIntake} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Area label="Relevant medical conditions / previous diagnoses" name="conditions" defaultValue={mh?.conditions} />
                <Area label="Allergies" name="allergies" defaultValue={mh?.allergies} />
                <Area label="Current medications (incl. supplements)" name="medications" defaultValue={mh?.medications} />
                <Area label="Previous surgeries" name="surgeries" defaultValue={mh?.surgeries} />
                <Area label="Family medical history" name="familyHistory" defaultValue={mh?.familyHistory} />
                <Area label="Sleep pattern" name="sleep" defaultValue={mh?.sleep} />
                <Area label="Appetite" name="appetite" defaultValue={mh?.appetite} />
                <Area label="Digestion" name="digestion" defaultValue={mh?.digestion} />
                <Area label="Exercise" name="exercise" defaultValue={mh?.exercise} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Smoking" name="smoking" defaultValue={mh?.smoking} />
                  <Field label="Alcohol" name="alcohol" defaultValue={mh?.alcohol} />
                </div>
              </div>
            </ActionForm>
          </section>

          <section className="card">
            <h2 className="section-title">Health complaints</h2>
            <div className="mt-3 space-y-3">
              {complaints.map((c) => {
                const flags = parseJson<string[]>(c.redFlags, []);
                return (
                  <div key={c.id} className="rounded-lg border border-ivory-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium">{c.title} <span className="text-xs text-charcoal-500">· {categoryByKey(c.category).title}</span></div>
                      <div className="flex gap-2">{c.sensitive && <Badge s="x" text="Confidential" />}{c.severity && <Badge s="x" text={`Severity ${c.severity}/10`} />}</div>
                    </div>
                    <p className="mt-1 text-sm text-charcoal-700">{c.symptoms}</p>
                    <p className="mt-1 text-xs text-charcoal-500">Submitted {fmtDateTime(c.createdAt)}{c.duration ? ` · Duration ${c.duration}` : ""}</p>
                    {flags.length > 0 && <div className="mt-2"><SafetyAlerts rules={flags} /></div>}
                  </div>
                );
              })}
              {!complaints.length && <p className="text-sm text-charcoal-500">No complaints recorded yet.</p>}
            </div>
          </section>
        </div>

        <section className="card h-fit">
          <h2 className="section-title">Health timeline</h2>
          <ol className="mt-4 space-y-4 border-l-2 border-forest-200 pl-4">
            {timeline.map((e, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-white bg-forest-600" />
                <div className="text-xs text-charcoal-500">{fmtDateTime(e.at)} · <span className="text-gold-700">{e.tag}</span></div>
                <div className="text-sm font-medium">{e.title}</div>
                <div className="line-clamp-2 text-xs text-charcoal-700">{e.body}</div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
