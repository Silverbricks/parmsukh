import { db } from "@/lib/db";
import { requirePatient } from "@/lib/auth";
import { ActionForm } from "@/components/action-form";
import { Area, PageHeader } from "@/components/ui";
import { requestCorrection, updateConsents } from "@/app/actions/patient";
import { CONSENT_TYPES } from "@/lib/constants";
import { fmtDateTime, label } from "@/lib/format";

export default async function PrivacyConsent() {
  const { patient } = await requirePatient();
  const history = await db.consent.findMany({ where: { patientId: patient.id }, orderBy: { createdAt: "desc" } });
  const current = (t: string) => history.find((c) => c.type === t)?.granted ?? false;
  return (
    <div className="space-y-6">
      <PageHeader title="Privacy & Consent" sub="Control how PARMSUKH uses your information. Changes are recorded with date and time." />
      <div className="card">
        <ActionForm action={updateConsents} submit="Update consent">
          {Object.entries(CONSENT_TYPES).filter(([k]) => k !== "PRIVACY_POLICY").map(([k, t]) => (
            <label key={k} className="flex items-start gap-2 text-sm"><input type="checkbox" name={k} defaultChecked={current(k)} className="mt-1" /> {t}</label>
          ))}
          <p className="text-xs text-charcoal-500">Withdrawing health-data consent may prevent us from providing consultations. Records we are legally required to retain will be kept for the required period.</p>
        </ActionForm>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card">
          <h2 className="section-title">Download my data</h2>
          <p className="mt-1 text-sm text-charcoal-700">Get a copy of your profile, case history, approved consultation summaries, prescriptions and orders (JSON).</p>
          <a href="/api/me/export" className="btn-outline mt-4">Download my data</a>
        </div>
        <div className="card">
          <h2 className="section-title">Request a correction</h2>
          <ActionForm action={requestCorrection} submit="Send request" resetOnSuccess>
            <Area label="What needs correcting?" name="details" />
          </ActionForm>
        </div>
      </div>
      <div className="card">
        <h2 className="section-title">Consent history</h2>
        <table className="table mt-2"><tbody>{history.map((c) => <tr key={c.id}><td>{fmtDateTime(c.createdAt)}</td><td>{label(c.type)}</td><td>{c.granted ? "Granted" : "Withdrawn"}</td><td className="text-xs text-charcoal-500">{label(c.source)}</td></tr>)}</tbody></table>
      </div>
    </div>
  );
}
