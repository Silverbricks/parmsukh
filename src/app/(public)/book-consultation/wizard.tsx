"use client";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { bookConsultation, getSlots, previewCoupon } from "@/app/actions/booking";
import { OtpField } from "@/components/otp-field";
import { FormMessage, Submit } from "@/components/submit";
import { SafetyAlerts } from "@/components/ui";
import { MODES, SERVICES, SYSTEMS } from "@/lib/constants";

type Doc = { id: string; name: string; systems: string[]; fee: number; followUpFee: number; modes: string[]; specialisations: string };

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
function nextDays(n: number) {
  const out: { v: string; d: string; w: string }[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    out.push({ v, d: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), w: d.toLocaleDateString("en-IN", { weekday: "short" }) });
  }
  return out;
}

function Step({ n, title, done, children }: { n: number; title: string; done?: boolean; children: React.ReactNode }) {
  return (
    <section className="card">
      <h2 className="flex items-center gap-3 font-serif text-xl font-semibold">
        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${done ? "bg-forest-700 text-white" : "bg-ivory-200 text-charcoal-700"}`}>{done ? "✓" : n}</span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Choice({ active, onClick, children, disabled }: { active: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      className={`rounded-lg border px-4 py-3 text-left text-sm transition disabled:opacity-40 ${active ? "border-forest-700 bg-forest-50 ring-2 ring-forest-200" : "border-stone-300 bg-white hover:border-forest-500"}`}>
      {children}
    </button>
  );
}

export function BookingWizard({ doctors, loggedIn, initial }: { doctors: Doc[]; loggedIn: boolean; initial: { doctorId?: string; system?: string; service?: string } }) {
  const [system, setSystem] = useState(initial.system && initial.system in SYSTEMS ? initial.system : "");
  const [doctorId, setDoctorId] = useState(initial.doctorId ?? (doctors.length === 1 ? doctors[0].id : ""));
  const [service, setService] = useState(initial.service && initial.service in SERVICES ? initial.service : "INITIAL");
  const [mode, setMode] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<string[] | null>(null);
  const [loadingSlots, startSlots] = useTransition();
  const [coupon, setCoupon] = useState("");
  const [couponOff, setCouponOff] = useState<number | null>(null);
  const [state, action] = useActionState(bookConsultation, null);

  const eligible = useMemo(() => doctors.filter((d) => !system || d.systems.includes(system)), [doctors, system]);
  const doctor = doctors.find((d) => d.id === doctorId);
  const fee = doctor ? (service === "FOLLOW_UP" && doctor.followUpFee ? doctor.followUpFee : doctor.fee) : 0;
  const days = useMemo(() => nextDays(14), []);

  useEffect(() => {
    setTime(""); setSlots(null);
    if (doctorId && date) startSlots(async () => setSlots(await getSlots(doctorId, date)));
  }, [doctorId, date]);

  if (state && "ok" in state) {
    return (
      <div className="space-y-4">
        <SafetyAlerts rules={state.safety} />
        <div className="card text-center">
          <div className="text-sm uppercase tracking-wide text-gold-700">Booking confirmed</div>
          <div className="mt-2 font-serif text-4xl font-semibold text-forest-800">{state.ref}</div>
          <p className="mt-3 text-charcoal-700">{state.doctor} · {state.mode}<br />{new Date(state.date + "T00:00:00").toDateString()} at {state.time}</p>
          <p className="mt-2 text-sm">Fee {inr(state.total)} – {state.paid ? "paid online" : "pay at the clinic / before your call"}</p>
          <p className="mt-2 text-xs text-charcoal-500">A confirmation SMS has been sent. Keep your booking reference.</p>
          {state.guest ? (
            <div className="mt-6 rounded-lg bg-ivory-100 p-4 text-sm">
              Create a free patient account with the same mobile number to manage this booking, share your case history and see your consultation summaries.
              <div className="mt-3"><Link href="/register" className="btn-primary">Create account</Link></div>
            </div>
          ) : <Link href="/dashboard/consultations" className="btn-primary mt-6">Go to my consultations</Link>}
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {["system", "doctorId", "service", "mode", "date", "time"].map((k) => (
        <input key={k} type="hidden" name={k} value={{ system, doctorId, service, mode, date, time }[k]} />
      ))}

      <Step n={1} title="Choose a therapy" done={!!system}>
        <div className="grid gap-3 sm:grid-cols-3">
          {Object.entries(SYSTEMS).map(([k, v]) => (
            <Choice key={k} active={system === k} onClick={() => { setSystem(k); if (doctor && !doctor.systems.includes(k)) setDoctorId(""); }}>
              <div className="font-medium">{v}</div>
            </Choice>
          ))}
        </div>
      </Step>

      <Step n={2} title="Select doctor & consultation type" done={!!doctorId && !!mode}>
        <div className="grid gap-3 sm:grid-cols-2">
          {eligible.map((d) => (
            <Choice key={d.id} active={doctorId === d.id} onClick={() => { setDoctorId(d.id); if (!d.modes.includes(mode)) setMode(""); }}>
              <div className="font-medium">{d.name}</div>
              <div className="text-xs text-charcoal-500">{d.specialisations.split(",").slice(0, 3).join(" · ")}</div>
              <div className="mt-1 text-xs">Fee {inr(d.fee)}</div>
            </Choice>
          ))}
          {!eligible.length && <p className="text-sm text-charcoal-500">No doctors currently offer this therapy.</p>}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="label">Service</span>
            <select className="input" value={service} onChange={(e) => setService(e.target.value)}>
              {Object.entries(SERVICES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <div><span className="label">Consultation mode</span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(MODES).map(([k, v]) => (
                <Choice key={k} active={mode === k} disabled={!doctor?.modes.includes(k)} onClick={() => setMode(k)}>{v}</Choice>
              ))}
            </div>
          </div>
        </div>
      </Step>

      <Step n={3} title="Pick a date & time" done={!!time}>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {days.map((d) => (
            <button type="button" key={d.v} onClick={() => setDate(d.v)} disabled={!doctorId}
              className={`min-w-[68px] rounded-lg border px-3 py-2 text-center text-xs disabled:opacity-40 ${date === d.v ? "border-forest-700 bg-forest-700 text-white" : "border-stone-300 bg-white hover:border-forest-500"}`}>
              <div>{d.w}</div><div className="text-sm font-semibold">{d.d}</div>
            </button>
          ))}
        </div>
        <div className="mt-3">
          {!doctorId ? <p className="text-sm text-charcoal-500">Select a doctor first.</p>
            : !date ? <p className="text-sm text-charcoal-500">Select a date to see live availability.</p>
            : loadingSlots || slots === null ? <p className="text-sm text-charcoal-500">Checking availability…</p>
            : slots.length === 0 ? <p className="text-sm text-charcoal-500">No slots available on this day. Please try another date.</p>
            : (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {slots.map((t) => (
                  <button type="button" key={t} onClick={() => setTime(t)}
                    className={`rounded-md border px-2 py-1.5 text-sm ${time === t ? "border-forest-700 bg-forest-700 text-white" : "border-stone-300 bg-white hover:border-forest-500"}`}>{t}</button>
                ))}
              </div>
            )}
        </div>
      </Step>

      <Step n={4} title="Your details & health concern">
        <div className="space-y-4">
          {!loggedIn && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block"><span className="label">Full name <span className="text-red-600">*</span></span><input className="input" name="name" required autoComplete="name" /></label>
              <label className="block"><span className="label">Email (optional)</span><input className="input" name="email" type="email" autoComplete="email" /></label>
              <div className="sm:col-span-2"><OtpField purpose="GUEST_BOOKING" /></div>
            </div>
          )}
          <label className="block">
            <span className="label">Briefly describe your health concern</span>
            <textarea className="textarea" name="concern" rows={3} maxLength={2000} placeholder="e.g. acidity and bloating for 6 months" />
            <span className="mt-1 block text-xs text-charcoal-500">Please don't include highly sensitive details here – you can share them privately with your practitioner. If you have a medical emergency call 112.</span>
          </label>
          {mode && mode !== "IN_PERSON" && (
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="teleconsent" required className="mt-1" /> I consent to an online / telephone consultation and understand that some conditions need in-person examination.</label>
          )}
        </div>
      </Step>

      <Step n={5} title="Payment & confirm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm"><input type="radio" name="paymentMethod" value="PAY_AT_CLINIC" defaultChecked /> Pay at clinic / before consultation</label>
            <label className="flex items-center gap-2 text-sm"><input type="radio" name="paymentMethod" value="ONLINE_MOCK" /> Pay online now <span className="text-xs text-charcoal-500">(test gateway)</span></label>
            <div className="flex gap-2 pt-2">
              <input className="input" name="coupon" placeholder="Coupon code" value={coupon} onChange={(e) => { setCoupon(e.target.value.toUpperCase()); setCouponOff(null); }} />
              <button type="button" className="btn-outline" disabled={!coupon || !fee}
                onClick={async () => { const r = await previewCoupon(coupon, fee); setCouponOff(r.ok ? r.discount : -1); }}>Apply</button>
            </div>
            {couponOff === -1 && <p className="text-xs text-red-700">Coupon not valid for consultations.</p>}
          </div>
          <div className="rounded-lg bg-ivory-100 p-4 text-sm">
            <div className="flex justify-between"><span>Consultation fee</span><span>{fee ? inr(fee) : "—"}</span></div>
            {couponOff && couponOff > 0 ? <div className="flex justify-between text-forest-700"><span>Discount</span><span>−{inr(couponOff)}</span></div> : null}
            <div className="mt-2 flex justify-between border-t border-ivory-200 pt-2 font-semibold"><span>Total</span><span>{fee ? inr(fee - (couponOff && couponOff > 0 ? couponOff : 0)) : "—"}</span></div>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <FormMessage state={state && "error" in state ? state : null} />
          <Submit className="btn-primary w-full py-3" pendingText="Confirming…">Confirm booking</Submit>
          {(!system || !doctorId || !mode || !time) && <p className="text-center text-xs text-charcoal-500">Complete steps 1–3 to confirm.</p>}
        </div>
      </Step>
    </form>
  );
}
