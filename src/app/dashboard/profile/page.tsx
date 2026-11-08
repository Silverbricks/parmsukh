import { db } from "@/lib/db";
import { requirePatient } from "@/lib/auth";
import { ActionForm } from "@/components/action-form";
import { Field, PageHeader, Select } from "@/components/ui";
import { deleteAddress, saveAddress, updateProfile } from "@/app/actions/patient";

export default async function Profile() {
  const { session, patient: p } = await requirePatient();
  const addresses = await db.address.findMany({ where: { userId: session.uid }, orderBy: { isDefault: "desc" } });
  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" sub={`Patient ID ${p.patientCode} · Registered mobile ${p.mobile}`} />
      <div className="card">
        <ActionForm action={updateProfile}>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="First name" name="firstName" defaultValue={p.firstName} required />
            <Field label="Last name" name="lastName" defaultValue={p.lastName} />
            <Field label="Date of birth" name="dob" type="date" defaultValue={p.dob} />
            <Select label="Sex assigned at birth (where clinically relevant)" name="sex" options={["Male", "Female", "Intersex", "Prefer not to say"].map((x) => [x, x] as [string, string])} defaultValue={p.sex} />
            <Field label="Gender identity (optional)" name="genderIdentity" defaultValue={p.genderIdentity} />
            <Field label="Email" name="email" type="email" defaultValue={p.email} />
            <Field label="WhatsApp number (optional)" name="whatsapp" defaultValue={p.whatsapp} />
            <Field label="Preferred language" name="language" defaultValue={p.language} placeholder="Punjabi / Hindi / English" />
            <Field label="Occupation" name="occupation" defaultValue={p.occupation} />
            <Field label="Residential address" name="address" defaultValue={p.address} className="md:col-span-3" />
            <Field label="City" name="city" defaultValue={p.city} />
            <Field label="State" name="state" defaultValue={p.state} />
            <Field label="PIN code" name="pinCode" defaultValue={p.pinCode} maxLength={6} />
            <Field label="Emergency contact (name & number)" name="emergencyContact" defaultValue={p.emergencyContact} className="md:col-span-2" />
            <Field label="GP / family doctor details" name="gpDetails" defaultValue={p.gpDetails} />
          </div>
        </ActionForm>
      </div>

      <div className="card">
        <h2 className="section-title">My delivery addresses</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {addresses.map((a) => (
            <li key={a.id} className="flex items-start justify-between rounded-lg border border-ivory-200 p-3">
              <div><b>{a.label}</b>{a.isDefault && <span className="badge ml-2 bg-forest-100 text-forest-800">Default</span>}<br />{a.name}, {a.mobile}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.pinCode}</div>
              <form action={deleteAddress}><input type="hidden" name="id" value={a.id} /><button className="text-xs text-red-700 hover:underline">Remove</button></form>
            </li>
          ))}
        </ul>
        <form action={saveAddress} className="mt-4 grid gap-3 md:grid-cols-3">
          <Field label="Label" name="label" defaultValue="Home" />
          <Field label="Recipient name" name="name" required defaultValue={`${p.firstName} ${p.lastName}`.trim()} />
          <Field label="Mobile" name="mobile" required defaultValue={p.mobile} />
          <Field label="Address line 1" name="line1" required className="md:col-span-2" />
          <Field label="Address line 2" name="line2" />
          <Field label="City" name="city" required />
          <Field label="State" name="state" required defaultValue="Punjab" />
          <Field label="PIN code" name="pinCode" required maxLength={6} pattern="\d{6}" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isDefault" /> Set as default</label>
          <div className="md:col-span-3"><button className="btn-outline">Add address</button></div>
        </form>
      </div>
    </div>
  );
}
