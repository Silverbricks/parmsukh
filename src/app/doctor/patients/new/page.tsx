import { ActionForm } from "@/components/action-form";
import { Field, PageHeader, Select } from "@/components/ui";
import { registerPatient } from "@/app/actions/doctor";

export default function RegisterPatient() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="Register a patient" sub="A Patient ID is generated automatically. One record per mobile number – duplicates are prevented." />
      <div className="card">
        <ActionForm action={registerPatient} submit="Register patient">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="First name" name="firstName" required />
            <Field label="Last name" name="lastName" />
            <Field label="Mobile" name="mobile" required inputMode="numeric" maxLength={10} />
            <Field label="Email" name="email" type="email" />
            <Field label="Date of birth" name="dob" type="date" />
            <Select label="Sex assigned at birth" name="sex" options={["Male", "Female", "Intersex", "Prefer not to say"].map((x) => [x, x] as [string, string])} />
            <Field label="Address" name="address" className="md:col-span-2" />
            <Field label="City" name="city" defaultValue="Bathinda" />
            <Field label="State" name="state" defaultValue="Punjab" />
            <Field label="Occupation" name="occupation" />
          </div>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="consent" className="mt-1" /> Patient has given written / verbal consent to the collection of health information and acknowledged the privacy policy.</label>
        </ActionForm>
      </div>
    </div>
  );
}
