import { CLINIC, MODES, SYSTEMS } from "@/lib/constants";
import { fmtDate, fmtDateTime, age, parseJson } from "@/lib/format";
import { ruleById } from "@/lib/safety";
import { LotusMark } from "./brand";

type Rx = { number: string; kind: string; instructions: string; precautions: string; approvedAt: Date | null; items: { name: string; potency: string; dosage: string; frequency: string; duration: string; notes: string }[] };
type Props = {
  c: { number: string; system: string; mode: string; completedAt: Date | null; createdAt: Date; mainComplaint: string; patientSummary: string; referral: string | null; followUpDate: string | null; safetyFlags: string };
  doctor: { name: string; qualifications: string; registrationNo: string | null; verified: boolean };
  patient: { name: string; code: string; dob: string | null; sex: string | null; mobile: string };
  prescriptions: Rx[];
};

/** Patient-facing consultation summary / prescription. Printable to PDF from the browser. Never includes private notes. */
export function ConsultationReport({ c, doctor, patient, prescriptions }: Props) {
  const flags = parseJson<string[]>(c.safetyFlags, []).map(ruleById).filter(Boolean);
  return (
    <article className="mx-auto max-w-3xl bg-white p-8 shadow-sm print:shadow-none">
      <header className="flex items-start justify-between border-b-2 border-gold-500 pb-4">
        <div className="flex items-center gap-3">
          <LotusMark className="h-14 w-14" />
          <div>
            <div className="font-serif text-3xl font-bold tracking-[0.12em] text-forest-800">{CLINIC.brand}</div>
            <div className="text-xs uppercase tracking-[0.18em] text-gold-700">Ayurveda &amp; Homoeopathy Centre</div>
            <div className="text-xs italic text-charcoal-500">{CLINIC.tagline}</div>
          </div>
        </div>
        <div className="text-right text-xs text-charcoal-700">
          <div className="font-semibold">{doctor.name}</div>
          <div>{doctor.qualifications}</div>
          {doctor.verified && doctor.registrationNo && <div>Reg. {doctor.registrationNo}</div>}
          <div>{CLINIC.address}</div>
        </div>
      </header>

      <section className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div><span className="text-charcoal-500">Patient:</span> {patient.name} ({patient.code})</div>
        <div><span className="text-charcoal-500">Consultation no:</span> {c.number}</div>
        <div><span className="text-charcoal-500">Age / Sex:</span> {age(patient.dob) ?? "—"} / {patient.sex ?? "—"}</div>
        <div><span className="text-charcoal-500">Date:</span> {fmtDateTime(c.completedAt ?? c.createdAt)}</div>
        <div><span className="text-charcoal-500">Type:</span> {SYSTEMS[c.system as keyof typeof SYSTEMS]} · {MODES[c.mode as keyof typeof MODES]}</div>
      </section>

      {c.mainComplaint && <section className="mt-5"><h3 className="text-lg font-semibold">Main complaint</h3><p className="text-sm">{c.mainComplaint}</p></section>}
      <section className="mt-4"><h3 className="text-lg font-semibold">Consultation summary &amp; recommendations</h3><p className="whitespace-pre-line text-sm">{c.patientSummary || "—"}</p></section>

      {prescriptions.map((rx) => (
        <section key={rx.number} className="mt-5 rounded-lg border border-ivory-200 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{rx.kind === "CLINICAL_PRESCRIPTION" ? "℞ Clinical prescription" : "Wellness recommendation"}</h3>
            <span className="text-xs text-charcoal-500">{rx.number}</span>
          </div>
          {rx.kind !== "CLINICAL_PRESCRIPTION" && <p className="text-xs text-charcoal-500">General wellness and lifestyle guidance – not a prescription.</p>}
          <table className="table mt-2">
            <thead><tr><th>Medicine / product</th><th>Potency</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr></thead>
            <tbody>{rx.items.map((i, k) => <tr key={k}><td>{i.name}{i.notes && <div className="text-xs text-charcoal-500">{i.notes}</div>}</td><td>{i.potency}</td><td>{i.dosage}</td><td>{i.frequency}</td><td>{i.duration}</td></tr>)}</tbody>
          </table>
          {rx.instructions && <p className="mt-2 text-sm"><b>Instructions:</b> {rx.instructions}</p>}
          {rx.precautions && <p className="mt-1 text-sm"><b>Precautions:</b> {rx.precautions}</p>}
        </section>
      ))}

      {(c.referral || flags.length > 0) && (
        <section className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm">
          <h3 className="font-semibold text-red-800">Referral &amp; safety advice</h3>
          {c.referral && <p>{c.referral}</p>}
          <ul className="mt-1 list-disc pl-5">{flags.map((f) => <li key={f!.id}>{f!.title}: {f!.action}</li>)}</ul>
        </section>
      )}
      <section className="mt-4 text-sm"><b>Follow-up:</b> {c.followUpDate ? fmtDate(c.followUpDate) : "As needed"}</section>

      <footer className="mt-10 flex items-end justify-between border-t border-ivory-200 pt-4 text-xs text-charcoal-500">
        <p className="max-w-md">Complementary therapies must not delay necessary medical treatment. Continue medicines prescribed by your doctor unless they advise otherwise. Emergency: 112.</p>
        <div className="text-right">
          <div className="font-serif text-base italic text-charcoal-900">{doctor.name}</div>
          <div>Digitally approved {prescriptions[0]?.approvedAt ? fmtDateTime(prescriptions[0].approvedAt) : fmtDateTime(c.completedAt)}</div>
        </div>
      </footer>
      <div className="mt-2 text-center text-[10px] text-charcoal-500">{CLINIC.name} · {CLINIC.address} · Practitioner: {CLINIC.practitioner}</div>
    </article>
  );
}
