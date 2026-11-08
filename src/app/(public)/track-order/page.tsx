"use client";
import { useState, useTransition } from "react";
import { requestTrackOtp, trackOrder } from "@/app/actions/store";
import { Badge } from "@/components/ui";

type Result = Awaited<ReturnType<typeof trackOrder>>;

export default function TrackOrder() {
  const [number, setNumber] = useState("");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [devOtp, setDevOtp] = useState<string>();
  const [res, setRes] = useState<Result | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="container-p max-w-xl py-12">
      <h1 className="text-4xl font-semibold">Track your order</h1>
      <p className="mt-1 text-sm text-charcoal-500">Enter your order number and the mobile number used at checkout.</p>
      <div className="card mt-6 space-y-4">
        <label className="block"><span className="label">Order number</span><input className="input" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="ORD-260001" /></label>
        <label className="block"><span className="label">Mobile number</span><input className="input" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))} maxLength={10} inputMode="numeric" /></label>
        {!sent ? (
          <button className="btn-primary" disabled={pending || !number || mobile.length !== 10}
            onClick={() => start(async () => { const r = await requestTrackOtp(number, mobile); setSent(true); setDevOtp(r.devOtp); })}>Send OTP</button>
        ) : (
          <>
            <p className="text-xs text-charcoal-500">If the details match an order, an OTP has been sent to that mobile.</p>
            {devOtp && <p className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">Development mode – OTP <b>{devOtp}</b></p>}
            <label className="block"><span className="label">OTP</span><input className="input" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} inputMode="numeric" /></label>
            <button className="btn-primary" disabled={pending || otp.length !== 6} onClick={() => start(async () => setRes(await trackOrder(number, mobile, otp)))}>Track</button>
          </>
        )}
        {res && "error" in res && <p className="text-sm text-red-700">{res.error}</p>}
      </div>
      {res && "order" in res && res.order && (
        <div className="card mt-6">
          <div className="flex items-center justify-between"><h2 className="section-title">{res.order.number}</h2><Badge s={res.order.status} /></div>
          <ul className="mt-3 text-sm">{res.order.items.map((i, k) => <li key={k}>{i.name} × {i.quantity}</li>)}</ul>
          {res.order.trackingNo && <p className="mt-2 text-sm">Courier: {res.order.courier} · Tracking: {res.order.trackingNo}</p>}
          <ol className="mt-4 space-y-2 border-l-2 border-forest-200 pl-4 text-sm">
            {res.order.events.map((e, k) => <li key={k}><b>{e.status.replace(/_/g, " ")}</b> – {new Date(e.at).toLocaleString("en-IN")}{e.note ? ` · ${e.note}` : ""}</li>)}
          </ol>
        </div>
      )}
    </div>
  );
}
