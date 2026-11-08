import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { ActionForm } from "@/components/action-form";
import { Field, Notice, PageHeader } from "@/components/ui";
import { saveSettings } from "@/app/actions/admin";

export default async function Settings() {
  await requirePermission("clinic:manage");
  const s = Object.fromEntries((await db.clinicSetting.findMany()).map((x) => [x.key, x.value]));
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Clinic settings" />
      <div className="card">
        <ActionForm action={saveSettings} submit="Save settings">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Clinic name" name="clinic_name" defaultValue={s.clinic_name} />
            <Field label="Phone" name="clinic_phone" defaultValue={s.clinic_phone} />
            <Field label="Address" name="clinic_address" defaultValue={s.clinic_address} className="md:col-span-2" hint="Verify the PIN code before printing it on official documents." />
            <Field label="Email" name="clinic_email" defaultValue={s.clinic_email} />
            <Field label="Opening hours" name="opening_hours" defaultValue={s.opening_hours} />
            <Field label="Clinic holidays (YYYY-MM-DD, comma separated)" name="holidays" defaultValue={s.holidays} className="md:col-span-2" hint="No appointments can be booked on these dates." />
            <Field label="Invoice prefix" name="invoice_prefix" defaultValue={s.invoice_prefix} />
            <Field label="GSTIN" name="gstin" defaultValue={s.gstin} />
          </div>
        </ActionForm>
      </div>
      <Notice tone="warn">
        <b>Integrations not yet connected:</b> payment gateway (Razorpay / PayU), SMS / WhatsApp provider, email service, video consultation provider.
        The system currently uses a test payment option and queues notifications in the database. Configure provider API keys via environment variables when ready.
      </Notice>
    </div>
  );
}
