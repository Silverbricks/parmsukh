import { requirePermission } from "@/lib/auth";
import { ActionForm } from "@/components/action-form";
import { Area, Field, PageHeader } from "@/components/ui";
import { createDoctor } from "@/app/actions/admin";
import { SYSTEMS } from "@/lib/constants";

export default async function NewDoctor() {
  await requirePermission("doctors:manage");
  return (
    <div className="max-w-3xl">
      <PageHeader title="Add doctor" sub="Creates the doctor's login and public profile. Default hours Mon–Sat 10:00–13:00 – adjust after saving." />
      <div className="card">
        <ActionForm action={createDoctor} submit="Create doctor">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full name (incl. title)" name="name" required placeholder="Dr …" />
            <Field label="Login email" name="email" type="email" required />
            <Field label="Mobile" name="mobile" />
            <Field label="Initial password (min 10 chars)" name="password" type="password" required minLength={10} />
            <Field label="Qualifications" name="qualifications" />
            <Field label="Specialisations (comma separated)" name="specialisations" />
            <Field label="Experience (years)" name="experienceYears" type="number" />
            <Field label="Languages" name="languages" defaultValue="English, Hindi, Punjabi" />
            <Field label="Consultation fee (₹)" name="fee" type="number" defaultValue={500} />
            <Field label="Follow-up fee (₹)" name="followUpFee" type="number" defaultValue={300} />
            <Field label="Slot duration (minutes)" name="slotMinutes" type="number" defaultValue={20} />
          </div>
          <div><span className="label">Consultation categories</span><div className="flex gap-4 text-sm">{Object.entries(SYSTEMS).map(([k, v]) => <label key={k} className="flex items-center gap-1"><input type="checkbox" name="systems" value={k} defaultChecked /> {v}</label>)}</div></div>
          <Area label="Profile description" name="bio" rows={4} />
        </ActionForm>
      </div>
    </div>
  );
}
