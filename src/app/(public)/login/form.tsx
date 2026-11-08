"use client";
import { useActionState } from "react";
import { patientLogin } from "@/app/actions/auth";
import { OtpField } from "@/components/otp-field";
import { FormMessage, Submit } from "@/components/submit";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(patientLogin, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <OtpField purpose="LOGIN" />
      <FormMessage state={state} />
      <Submit pendingText="Verifying…" className="btn-primary w-full">Log in</Submit>
    </form>
  );
}
