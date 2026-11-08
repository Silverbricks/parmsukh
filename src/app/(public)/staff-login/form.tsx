"use client";
import { useActionState } from "react";
import { staffLogin } from "@/app/actions/auth";
import { FormMessage, Submit } from "@/components/submit";
import { Field } from "@/components/ui";

export function StaffLoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(staffLogin, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Email" name="email" type="email" required autoComplete="username" />
      <Field label="Password" name="password" type="password" required autoComplete="current-password" />
      <FormMessage state={state} />
      <Submit pendingText="Signing in…" className="btn-primary w-full">Sign in</Submit>
    </form>
  );
}
