"use client";
import Link from "next/link";
import { useActionState } from "react";
import { patientRegister } from "@/app/actions/auth";
import { OtpField } from "@/components/otp-field";
import { FormMessage, Submit } from "@/components/submit";
import { Field } from "@/components/ui";
import { CONSENT_TYPES } from "@/lib/constants";

const REQUIRED = ["PRIVACY_POLICY", "HEALTH_DATA"];

export function RegisterForm() {
  const [state, action] = useActionState(patientRegister, null);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" name="firstName" required autoComplete="given-name" />
        <Field label="Last name" name="lastName" autoComplete="family-name" />
        <Field label="Date of birth" name="dob" type="date" required />
        <Field label="Email (optional)" name="email" type="email" autoComplete="email" />
      </div>
      <OtpField purpose="REGISTER" />
      <fieldset className="space-y-2 rounded-lg border border-ivory-200 bg-ivory-50 p-4">
        <legend className="px-1 text-sm font-medium">Consent</legend>
        {Object.entries(CONSENT_TYPES).map(([k, t]) => (
          <label key={k} className="flex items-start gap-2 text-sm">
            <input type="checkbox" name={`consent_${k}`} className="mt-1" required={REQUIRED.includes(k)} defaultChecked={REQUIRED.includes(k) ? false : undefined} />
            <span>{k === "PRIVACY_POLICY" ? <>I have read and accept the <Link href="/privacy" target="_blank" className="underline">Privacy Policy</Link></> : t}{REQUIRED.includes(k) && <span className="text-red-600"> *</span>}</span>
          </label>
        ))}
        <p className="text-xs text-charcoal-500">You can change optional consents at any time from your dashboard.</p>
      </fieldset>
      <FormMessage state={state} />
      <Submit pendingText="Creating account…" className="btn-primary w-full">Create account</Submit>
    </form>
  );
}
