"use client";
import { useState, useTransition } from "react";
import { requestOtp } from "@/app/actions/auth";

/** Mobile number + "Send OTP" + code entry. Renders inputs named `mobile` and `otp`. */
export function OtpField({ purpose, defaultMobile = "", onMobile, lockMobile = false }: { purpose: string; defaultMobile?: string; onMobile?: (m: string) => void; lockMobile?: boolean }) {
  const [mobile, setMobile] = useState(defaultMobile);
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState<{ t: "ok" | "err"; s: string } | null>(null);
  const [devOtp, setDevOtp] = useState<string | undefined>();
  const [pending, start] = useTransition();

  const send = () => start(async () => {
    const r = await requestOtp(mobile, purpose);
    if (r.ok) { setSent(true); setDevOtp(r.devOtp); setMsg({ t: "ok", s: "OTP sent by SMS. Valid for 10 minutes." }); }
    else setMsg({ t: "err", s: r.error ?? "Could not send OTP." });
  });

  return (
    <div className="space-y-3">
      <div>
        <span className="label">Mobile number <span className="text-red-600">*</span></span>
        <div className="flex gap-2">
          <span className="input w-auto shrink-0 bg-ivory-100 text-charcoal-500">+91</span>
          <input className="input" name="mobile" inputMode="numeric" autoComplete="tel-national" maxLength={10} required value={mobile} readOnly={lockMobile}
            onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); setMobile(v); onMobile?.(v); setSent(false); }} placeholder="10-digit mobile" />
          <button type="button" className="btn-outline shrink-0" onClick={send} disabled={pending || mobile.length !== 10}>
            {pending ? "Sending…" : sent ? "Resend" : "Send OTP"}
          </button>
        </div>
      </div>
      {sent && (
        <label className="block">
          <span className="label">Enter OTP <span className="text-red-600">*</span></span>
          <input className="input tracking-[0.5em]" name="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required placeholder="••••••" />
        </label>
      )}
      {msg && <p className={`text-xs ${msg.t === "ok" ? "text-forest-700" : "text-red-700"}`}>{msg.s}</p>}
      {devOtp && <p className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">Development mode – no SMS provider configured. Your OTP is <b>{devOtp}</b></p>}
    </div>
  );
}
