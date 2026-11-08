import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireDoctor } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { doctorCanAccessPatient } from "@/lib/clinical";
import { ActionForm } from "@/components/action-form";
import { Badge, Field, Notice, PageHeader, SafetyAlerts, Select } from "@/components/ui";
import { doctorUploadDocument, startConsultation } from "@/app/actions/doctor";
import { age, fmtDate, fmtDateTime, label, parseJson } from "@/lib/format";
import { categoryByKey, DOCUMENT_KINDS, MODES, SERVICES, SYSTEMS } from "@/lib/constants";

function StartForm({ patientId }: { patientId: string }) {
  return (
    <form action={startConsultation} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="patientId" value={patientId} />
      <label className="block"><span className="label">Therapy</span><select className="input" name="system">{Object.entries(SYSTEMS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label className="block"><span className="label">Type</span><select className="input" name="type">{Object.entries(SERVICES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label className="block"><span className="label">Mode</span><select className="input" name="mode">{Object.entries(MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <button className="btn-primary">Start consultation</button>
    </form>
  );
}

export default async function DoctorPatient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, doctor } = await requireDoctor();
  const p = await db.patient.findUnique({ where: { id } });
  if (!p) notFound();
  const access = await doctorCanAccessPatient(doctor.id, session.uid, p.id);

  const header = (
    <PageHeader title={`${p.firstName} ${p.lastName}`} sub={`${p.patientCode} · ${age(p.dob) ?? "?"} yrs · ${p.sex ?? "—"} · ${p.mobile}${p.city ? ` · ${p.city}` : ""}`} />
  );
  if (!access) {
    await audit(session, "PATIENT_DIRECTORY_VIEW", "Patient", p.id);
    return (
      <div className="space-y-6">
        {header}
        <Notice tone="warn">You have no appointment or consultation with this patient, so their clinical record is restricted. Starting a consultation records a care relationship and is audited.</Notice>
        <div className="card"><StartForm patientId={p.id} /></div>
      </div>
    );
  }

  await audit(session, "CLINICAL_RECORD_VIEW", "Patient", p.id);
  const [mh, complaints, consultations, docs, followUps, rxs] = await Promise.all([
    db.medicalHistory.findUnique({ where: { patientId: p.id } }),
    db.healthComplaint.findMany({ where: { patientId: p.id }, orderBy: { createdAt: "desc" } }),
    // Doctors see their own consultations in full; others' consultations show only the approved summary.
    db.consultation.findMany({ where: { patientId: p.id }, include: { doctor: { include: { user: true } } }, orderBy: { createdAt: "desc" } }),
    db.patientDocument.findMany({ where: { patientId: p.id }, orderBy: { createdAt: "desc" } }),
    db.followUp.findMany({ where: { patientId: p.id }, orderBy: { dueDate: "desc" } }),
    db.prescription.findMany({ where: { patientId: p.id, approved: true }, include: { items: true }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  const allFlags = [...new Set(complaints.flatMap((c) => parseJson<string[]>(c.redFlags, [])))];

  return (
    <div className="space-y-6">
      {header}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="card border-red-200 bg-red-50/40"><div className="text-xs font-semibold uppercase text-red-800">Allergies</div><div className="text-sm">{mh?.allergies || "Not recorded"}</div></div>
        <div className="card"><div className="text-xs font-semibold uppercase text-charcoal-500">Current medications</div><div className="text-sm">{mh?.medications || "Not recorded"}</div></div>
        <div className="card"><div className="text-xs font-semibold uppercase text-charcoal-500">Conditions</div><div className="text-sm">{mh?.conditions || "Not recorded"}</div></div>
      </div>
      {allFlags.length > 0 && <SafetyAlerts rules={allFlags} audience="doctor" />}
      <div className="card"><h2 className="section-title mb-3">New consultation</h2><StartForm patientId={p.id} /></div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card">
          <h2 className="section-title">Medical history <span className="text-xs font-normal text-charcoal-500">(patient-submitted{mh ? `, updated ${fmtDateTime(mh.updatedAt)}` : ""})</span></h2>
          {mh ? (
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {([["Height", mh.heightCm && `${mh.heightCm} cm`], ["Weight", mh.weightKg && `${mh.weightKg} kg`], ["Surgeries", mh.surgeries], ["Family history", mh.familyHistory], ["Sleep", mh.sleep], ["Appetite", mh.appetite], ["Digestion", mh.digestion], ["Water", mh.waterIntake], ["Exercise", mh.exercise], ["Stress", mh.stressLevel && `${mh.stressLevel}/10`], ["Smoking", mh.smoking], ["Alcohol", mh.alcohol]] as [string, unknown][]).map(([k, v]) => (
                <div key={k}><dt className="text-xs text-charcoal-500">{k}</dt><dd>{(v as string) || "—"}</dd></div>
              ))}
            </dl>
          ) : <p className="mt-2 text-sm text-charcoal-500">Not submitted.</p>}
          <div className="mt-3 text-xs text-charcoal-500">GP: {p.gpDetails ?? "—"} · Emergency contact: {p.emergencyContact ?? "—"} · Occupation: {p.occupation ?? "—"}</div>
        </section>

        <section className="card">
          <h2 className="section-title">Health complaints & questionnaires</h2>
          <div className="mt-3 space-y-3">
            {complaints.map((c) => {
              const cat = categoryByKey(c.category);
              const answers = parseJson<Record<string, string>>(c.answers, {});
              return (
                <details key={c.id} className="rounded-lg border border-ivory-200 p-3">
                  <summary className="cursor-pointer text-sm"><b>{c.title}</b> · {cat.title} {c.sensitive && <Badge s="x" text="Sensitive" />} <span className="text-xs text-charcoal-500">{fmtDate(c.createdAt)}{c.severity ? ` · ${c.severity}/10` : ""}</span></summary>
                  <p className="mt-2 text-sm">{c.symptoms}</p>
                  <p className="text-xs text-charcoal-500">Started {c.startDate ?? "—"} · Duration {c.duration ?? "—"} · Frequency {c.frequency ?? "—"}</p>
                  {c.previousTreatment && <p className="text-xs"><b>Previous treatment:</b> {c.previousTreatment}</p>}
                  {c.investigations && <p className="text-xs"><b>Investigations:</b> {c.investigations}</p>}
                  <ul className="mt-2 text-xs">{cat.questions.filter((q) => answers[q.id]).map((q) => <li key={q.id}><span className="text-charcoal-500">{q.label}</span> – <b className={q.redFlag && answers[q.id] === "yes" ? "text-red-700" : ""}>{answers[q.id]}</b></li>)}</ul>
                </details>
              );
            })}
            {!complaints.length && <p className="text-sm text-charcoal-500">No complaints submitted.</p>}
          </div>
        </section>

        <section className="card xl:col-span-2">
          <h2 className="section-title">Consultation history</h2>
          <table className="table mt-3">
            <thead><tr><th>No.</th><th>Date</th><th>Doctor</th><th>Therapy</th><th>Assessment / summary</th><th>Status</th><th /></tr></thead>
            <tbody>{consultations.map((c) => {
              const own = c.doctorId === doctor.id;
              return (
                <tr key={c.id}>
                  <td className="font-mono text-xs">{c.number}</td><td>{fmtDate(c.createdAt)}</td><td>{c.doctor.user.name}</td>
                  <td>{SYSTEMS[c.system as keyof typeof SYSTEMS]}<div className="text-xs text-charcoal-500">{label(c.progressStatus)}</div></td>
                  <td className="max-w-md text-xs">{own ? c.assessment || c.mainComplaint : c.summaryApproved ? c.patientSummary : <i>Restricted – another practitioner’s notes</i>}</td>
                  <td><Badge s={c.status} /></td>
                  <td>{own && <Link className="text-forest-700 underline" href={`/doctor/consultations/${c.id}`}>Open</Link>}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </section>

        <section className="card">
          <h2 className="section-title">Current prescriptions</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {rxs.map((r) => <li key={r.id}><b>{r.number}</b> {label(r.kind)} · {r.items.map((i) => `${i.name} ${i.potency}`.trim()).join(", ")}</li>)}
            {!rxs.length && <li className="text-charcoal-500">None.</li>}
          </ul>
          <h3 className="mt-5 font-semibold">Follow-ups</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {followUps.map((f) => (
              <li key={f.id} className="rounded border border-ivory-200 p-2">
                Due {fmtDate(f.dueDate)} <Badge s={f.status} />
                {f.reportedAt && <div className="mt-1 text-xs"><b>Patient report ({label(f.improvement)}):</b> {f.patientReport}{f.newSymptoms ? ` · New: ${f.newSymptoms}` : ""}{f.adverseEvents ? ` · Adverse: ${f.adverseEvents}` : ""}</div>}
              </li>
            ))}
            {!followUps.length && <li className="text-charcoal-500">None.</li>}
          </ul>
        </section>

        <section className="card">
          <h2 className="section-title">Reports & documents</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {docs.map((d) => <li key={d.id} className="flex justify-between"><span>{d.title} <span className="text-xs text-charcoal-500">· {label(d.kind)} · {fmtDate(d.createdAt)} · {d.uploaderRole === "PATIENT" ? "patient" : "clinic"}</span></span><a className="text-forest-700 underline" target="_blank" href={`/api/documents/${d.id}`}>Open</a></li>)}
            {!docs.length && <li className="text-charcoal-500">No documents.</li>}
          </ul>
          <ActionForm action={doctorUploadDocument} submit="Upload" resetOnSuccess className="mt-4 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="patientId" value={p.id} />
            <Select label="Type" name="kind" options={[...DOCUMENT_KINDS]} required />
            <Field label="Title" name="title" />
            <label className="block sm:col-span-2"><span className="label">File</span><input className="input" type="file" name="file" required accept=".pdf,.jpg,.jpeg,.png,.webp" /></label>
          </ActionForm>
        </section>
      </div>
    </div>
  );
}
