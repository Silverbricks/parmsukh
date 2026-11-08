"use client";
import { useFormStatus } from "react-dom";

export function Submit({ children, className = "btn-primary", pendingText = "Saving…", name, value, formNoValidate }: { children: React.ReactNode; className?: string; pendingText?: string; name?: string; value?: string; formNoValidate?: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" className={className} disabled={pending} name={name} value={value} formNoValidate={formNoValidate}>{pending ? pendingText : children}</button>;
}

export function FormMessage({ state }: { state: { error?: string; message?: string } | null }) {
  if (!state) return null;
  if (state.error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p>;
  if (state.message) return <p className="rounded-lg bg-forest-50 px-3 py-2 text-sm text-forest-800">{state.message}</p>;
  return null;
}
