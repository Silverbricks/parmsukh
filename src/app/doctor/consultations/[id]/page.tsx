import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireDoctor } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ActionForm } from "@/components/action-form";
import { Area, Badge, Field, SafetyAlerts, Select } from "@/components/ui";
import { addPrescription, completeConsultation, saveConsultation, setPrescriptionApproval } from "@/app/actions/doctor";
import { AYUR_FIELDS, HOMEO_FIELDS, SHORT_FIELDS } from "@/lib/clinical-fields";
import { SAFETY_RULES } from "@/lib/safety";
import { age, fmtDate, fmtDateTime, istNow, label, parseJson, addDays } from "@/lib/format";
import { categoryByKey, MODES, PROGRESS_STATUSES, SYSTEMS } from "@/lib/constants";

const STEPS = ["Select patient", "Review case history", "Conduct consultation", "Clinical documentation", "Treatment & recommendations", "Medicine / product selection", "Complete consultation"];

export default async function Workspace({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, doctor } = await requireDoctor();
  const c = await db.consultation.findFirst({
    where: { id, doctorId: doctor.id },
    include: { patient: { include: { medicalHistory: true } }, homeopathy: true, ayurveda: true, prescriptions: { include: { items: { include: { product: true } } }, orderBy: { createdAt: "asc" } }, appointment: true },
  });
  if (!c) notFound();
  await audit(session, "CLINICAL_RECORD_VIEW", "Patient", c.patientId, { consultation: c.number });

  const p = c.patient, mh = p.medicalHistory;
  const [complaints, previous, docs, products] = await Promise.all([
    db.healthComplaint.findMany({ where: { patientId: p.id }, orderBy: { createdAt: "desc" }, take: 6 }),
    db.consultation.findMany({ where: { patientId: p.id, doctorId: doctor.id, id: { not: c.id } }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.patientDocument.findMany({ where: { patientId: p.id }, orderBy: { createdAt: "desc" }, take: 8 }),
    db.product.findMany({ where: { active: true, ...(c.system === "GENERAL" ? {} : { system: { in: [c.system, "HERBAL", "WELLNESS", "OTHER"] } }) }, orderBy: { name: "asc" } }),
  ]);
  const flags = parseJson<string[]>(c.safetyFlags, []);
  const complaintFlags = [...new Set(complaints.flatMap((x) => parseJson<string[]>(x.redFlags, [])))];
  const done = c.status === "COMPLETED";
  const stepIndex = done ? 7 : c.prescriptions.length ? 6 : c.assessment || c.plan ? 4 : c.subjective ? 3 : 2;
  const rec = (c.homeopathy ?? c.ayurveda ?? {}) as Record<string, string>;
  const fields = c.system === "HOMOEOPATHY" ? HOMEO_FIELDS : c.system === "AYURVEDA" ? AYUR_FIELDS : [];
  const prefix = c.system === "HOMOEOPATHY" ? "h_" : "a_";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-gold-700">{SYSTEMS[c.system as keyof typeof SYSTEMS]} · {label(c.type)} · {MODES[c.mode as keyof typeof MODES]}</div>
          <h1 className="text-3xl font-semibold">{c.number} – {p.firstName} {p.lastName}</h1>
          <div className="text-sm text-charcoal-500">{p.patientCode} · {age(p.dob) ?? "?"} yrs · {p.sex ?? "—"} · {p.mobile} · started {fmtDateTime(c.createdAt)}</div>
        </div>
        <div className="flex gap-2"><Badge s={c.status} /><Link href={`/doctor/patients/${p.id}`} className="btn-outline btn-sm">Full patient record</Link><Link href={`/doctor/consultations/${c.id}/report`} className="btn-outline btn-sm">Report / PDF</Link></div>
      </div>

      <ol className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:grid-cols-7">
        {STEPS.map((s, i) => (
          <li key={s} className={`rounded-lg border px-2 py-2 ${i < stepIndex ? "border-forest-600 bg-forest-50 text-forest-800" : i === stepIndex ? "border-gold-500 bg-gold-100 text-gold-700" : "border-ivory-200 bg-white text-charcoal-500"}`}>
            <span className="font-semibold">{i + 1}.</span> {s}
          </li>
        ))}
      </ol>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <ActionForm action={saveConsultation} submit="Save consultation" className="space-y-6">
            <input type="hidden" name="id" value={c.id} />
            <section className="card space-y-4">
              <h2 className="section-title">Clinical documentation – SOAP</h2>
              <Field label="Main complaint" name="mainComplaint" defaultValue={c.mainComplaint} />
              <div className="grid gap-4 md:grid-cols-2">
                <Area label="S – Subjective (patient-reported symptoms)" name="subjective" defaultValue={c.subjective} rows={4} />
                <Area label="O – Objective (observations, available reports)" name="objective" defaultValue={c.objective} rows={4} />
                <Area label="A – Assessment (incl. clinical uncertainties)" name="assessment" defaultValue={c.assessment} rows={4} />
                <Area label="P – Plan (next steps, permitted recommendations, referrals, safety instructions)" name="plan" defaultValue={c.plan} rows={4} />
              </div>
            </section>

            {fields.length > 0 && (
              <section className="card">
                <h2 className="section-title">{c.system === "HOMOEOPATHY" ? "Homoeopathy case record" : "Ayurveda case record"}</h2>
                <p className="mb-4 text-xs text-charcoal-500">All entries are practitioner-recorded. The system does not diagnose or select remedies.</p>
                <div className="grid gap-4 md:grid-cols-2">
                  {fields.map(([k, l]) => SHORT_FIELDS.has(k)
                    ? <Field key={k} label={l} name={`${prefix}${k}`} defaultValue={rec[k]} />
                    : <Area key={k} label={l} name={`${prefix}${k}`} defaultValue={rec[k]} rows={2} />)}
                </div>
              </section>
            )}

            <section className="card space-y-4">
              <h2 className="section-title">Safety screening & referral</h2>
              {complaintFlags.length > 0 && <SafetyAlerts rules={complaintFlags} audience="doctor" />}
              <div className="grid gap-1 sm:grid-cols-2">
                {SAFETY_RULES.map((r) => (
                  <label key={r.id} className="flex items-start gap-2 text-xs">
                    <input type="checkbox" name="flags" value={r.id} defaultChecked={flags.includes(r.id)} className="mt-0.5" />
                    <span><Badge s={r.urgency} /> {r.title}</span>
                  </label>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name="safetyScreened" defaultChecked={c.safetyScreened} /> Safety screening completed for this consultation</label>
              <div className="grid gap-4 md:grid-cols-2">
                <Area label="Referral advice given (to whom, why, urgency)" name="referral" defaultValue={c.referral} />
                <Area label="Referral outcome (where known)" name="referralOutcome" defaultValue={c.referralOutcome} />
              </div>
            </section>

            <section className="card">
              <Area label="Private practitioner notes – never shown to the patient or non-clinical staff" name="privateNotes" defaultValue={c.privateNotes} rows={3} />
              {done && <label className="mt-3 flex items-center gap-2 text-sm text-gold-700"><input type="checkbox" name="amend" /> Amend completed record (change is audited)</label>}
            </section>
          </ActionForm>

          <section className="card space-y-4">
            <h2 className="section-title">Treatment, recommendations & products</h2>
            {c.prescriptions.map((rx) => (
              <div key={rx.id} className="rounded-lg border border-ivory-200 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><b>{rx.number}</b> · {rx.kind === "CLINICAL_PRESCRIPTION" ? "Clinical prescription" : "Wellness recommendation"} {rx.approved ? <Badge s="CONFIRMED" text="Approved" /> : <Badge s="PENDING" text="Draft" />}</div>
                  <form action={setPrescriptionApproval} className="flex gap-1">
                    <input type="hidden" name="id" value={rx.id} />
                    {rx.approved ? <button name="op" value="revoke" className="btn-ghost btn-sm">Revoke approval</button>
                      : <><button name="op" value="approve" className="btn-primary btn-sm">Approve</button><button name="op" value="delete" className="btn-ghost btn-sm text-red-700">Delete</button></>}
                  </form>
                </div>
                <ul className="mt-2 space-y-1">
                  {rx.items.map((i) => (
                    <li key={i.id}>
                      {i.name} {i.potency} – {i.dosage} {i.frequency} {i.duration && `for ${i.duration}`}
                      {i.product?.warnings && <div className="text-xs text-amber-800">⚠ {i.product.warnings}</div>}
                      {i.product?.requiresPrescription && <div className="text-xs text-red-700">Prescription-only product{i.product.regulatoryInfo ? ` – ${i.product.regulatoryInfo}` : ""}</div>}
                    </li>
                  ))}
                </ul>
                {rx.precautions && <div className="mt-1 text-xs"><b>Precautions:</b> {rx.precautions}</div>}
              </div>
            ))}
            <details className="rounded-lg border border-dashed border-stone-300 p-3" open>
              <summary className="cursor-pointer text-sm font-medium text-forest-700">+ Add prescription / recommendation</summary>
              <ActionForm action={addPrescription} submit="Save" resetOnSuccess className="mt-3 space-y-3">
                <input type="hidden" name="consultationId" value={c.id} />
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2"><input type="radio" name="kind" value="CLINICAL_PRESCRIPTION" defaultChecked={c.system !== "GENERAL"} /> Clinical prescription</label>
                  <label className="flex items-center gap-2"><input type="radio" name="kind" value="WELLNESS_RECOMMENDATION" defaultChecked={c.system === "GENERAL"} /> General wellness recommendation</label>
                </div>
                <div className="overflow-x-auto">
                  <table className="table min-w-[820px]">
                    <thead><tr><th>Catalogue product (optional)</th><th>Name / remedy</th><th>Potency</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Notes</th></tr></thead>
                    <tbody>{[0, 1, 2, 3].map((i) => (
                      <tr key={i}>
                        <td><select className="input py-1 text-xs" name={`product_${i}`} defaultValue=""><option value="">—</option>{products.map((pr) => <option key={pr.id} value={pr.id}>{pr.name} ({pr.packSize}){pr.requiresPrescription ? " ℞" : ""}</option>)}</select></td>
                        {["name", "potency", "dosage", "frequency", "duration", "notes"].map((f) => <td key={f}><input className="input py-1 text-xs" name={`${f}_${i}`} /></td>)}
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <Area label="Instructions" name="instructions" rows={2} />
                  <Area label="Precautions / interactions" name="precautions" rows={2} />
                  <Field label="Valid until (for store purchase)" name="validUntil" type="date" defaultValue={addDays(istNow().date, 90)} />
                </div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="approve" /> I approve this for release to the patient</label>
              </ActionForm>
            </details>
          </section>

          <section className="card">
            <h2 className="section-title">Complete consultation</h2>
            <ActionForm action={completeConsultation} submit={done ? "Update completion" : "Complete consultation"} className="mt-3 space-y-4">
              <input type="hidden" name="id" value={c.id} />
              <Area label="Patient-facing summary (shown in the patient dashboard and report once approved)" name="patientSummary" defaultValue={c.patientSummary} rows={5} />
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Follow-up date" name="followUpDate" type="date" defaultValue={c.followUpDate ?? addDays(istNow().date, 14)} />
                <Select label="Progress status" name="progressStatus" options={[...PROGRESS_STATUSES]} defaultValue={c.progressStatus} />
                <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="summaryApproved" defaultChecked={c.summaryApproved} /> Approve summary for patient</label>
              </div>
            </ActionForm>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="card border-red-200 text-sm">
            <div className="text-xs font-semibold uppercase text-red-800">Allergies</div><div>{mh?.allergies || "Not recorded"}</div>
            <div className="mt-2 text-xs font-semibold uppercase text-charcoal-500">Current medications</div><div>{mh?.medications || "Not recorded"}</div>
            <div className="mt-2 text-xs font-semibold uppercase text-charcoal-500">Conditions</div><div>{mh?.conditions || "—"}</div>
            {p.sex === "Female" && <div className="mt-2 text-xs text-amber-800">Check pregnancy / breastfeeding status before herbal recommendations.</div>}
          </div>
          {c.appointment?.concern && <div className="card text-sm"><div className="text-xs font-semibold uppercase text-charcoal-500">Booking concern</div>{c.appointment.concern}</div>}
          <div className="card text-sm">
            <div className="mb-2 text-xs font-semibold uppercase text-charcoal-500">Recent complaints</div>
            <ul className="space-y-2">{complaints.map((x) => <li key={x.id}><b>{x.title}</b> <span className="text-xs text-charcoal-500">{categoryByKey(x.category).title} · {fmtDate(x.createdAt)}</span><div className="line-clamp-2 text-xs">{x.symptoms}</div></li>)}</ul>
            {!complaints.length && <p className="text-xs text-charcoal-500">None.</p>}
          </div>
          <div className="card text-sm">
            <div className="mb-2 text-xs font-semibold uppercase text-charcoal-500">Previous consultations (you)</div>
            <ul className="space-y-2">{previous.map((x) => <li key={x.id}><Link className="text-forest-700 underline" href={`/doctor/consultations/${x.id}`}>{x.number}</Link> <span className="text-xs">{fmtDate(x.createdAt)} · {label(x.progressStatus)}</span><div className="line-clamp-2 text-xs">{x.assessment}</div></li>)}</ul>
            {!previous.length && <p className="text-xs text-charcoal-500">First consultation.</p>}
          </div>
          <div className="card text-sm">
            <div className="mb-2 text-xs font-semibold uppercase text-charcoal-500">Reports</div>
            <ul className="space-y-1">{docs.map((d) => <li key={d.id}><a className="text-forest-700 underline" target="_blank" href={`/api/documents/${d.id}`}>{d.title}</a> <span className="text-xs text-charcoal-500">{label(d.kind)}</span></li>)}</ul>
            {!docs.length && <p className="text-xs text-charcoal-500">None uploaded.</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
