"use client";
import { useActionState, useEffect, useRef } from "react";
import { FormMessage, Submit } from "./submit";

type State = { error?: string; message?: string; ok?: boolean } | null;

/** Generic form bound to a server action returning { error } | { message }. */
export function ActionForm({ action, children, submit = "Save", pendingText = "Saving…", className = "space-y-4", resetOnSuccess = false, submitClass = "btn-primary", encType }:
  { action: (s: State, fd: FormData) => Promise<State>; children: React.ReactNode; submit?: string; pendingText?: string; className?: string; resetOnSuccess?: boolean; submitClass?: string; encType?: string }) {
  const [state, act] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (resetOnSuccess && state?.message) ref.current?.reset(); }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={act} className={className} encType={encType}>
      {children}
      <FormMessage state={state} />
      <Submit className={submitClass} pendingText={pendingText}>{submit}</Submit>
    </form>
  );
}
