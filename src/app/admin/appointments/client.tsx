"use client";
import { useActionState, useState, useTransition } from "react";
import { adminSlots, receptionBook, rescheduleAppointment } from "@/app/actions/admin";
import { FormMessage, Submit } from "@/components/submit";
import { MODES, SERVICES, SYSTEMS } from "@/lib/constants";

function SlotPicker({ doctorId }: { doctorId: string }) {
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[] | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <label className="block"><span className="label">Date</span>
        <input className="input" type="date" name="date" required value={date} onChange={(e) => { setDate(e.target.value); setSlots(null); if (doctorId && e.target.value) start(async () => setSlots(await adminSlots(doctorId, e.target.value))); }} />
      </label>
      <label className="block"><span className="label">Time</span>
        <select className="input" name="time" required disabled={!slots?.length}>
          <option value="">{pending ? "Loading…" : slots ? (slots.length ? "Select" : "No slots") : "Pick a date"}</option>
          {slots?.map((t) => <option key={t}>{t}</option>)}
        </select>
      </label>
    </>
  );
}

export function ReceptionBooking({ doctors }: { doctors: { id: string; name: string }[] }) {
  const [doctorId, setDoctorId] = useState(doctors[0]?.id ?? "");
  const [state, action] = useActionState(receptionBook, null);
  return (
    <details className="card">
      <summary className="cursor-pointer font-serif text-lg font-semibold text-forest-800">+ New booking (walk-in / phone)</summary>
      <form action={action} className="mt-4 grid gap-3 md:grid-cols-4">
        <label className="block"><span className="label">First name *</span><input className="input" name="firstName" required /></label>
        <label className="block"><span className="label">Last name</span><input className="input" name="lastName" /></label>
        <label className="block"><span className="label">Mobile *</span><input className="input" name="mobile" required maxLength={10} /></label>
        <label className="block"><span className="label">Doctor</span>
          <select className="input" name="doctorId" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>{doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
        </label>
        <label className="block"><span className="label">Therapy</span><select className="input" name="system">{Object.entries(SYSTEMS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="block"><span className="label">Service</span><select className="input" name="service">{Object.entries(SERVICES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="block"><span className="label">Mode</span><select className="input" name="mode">{Object.entries(MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <div />
        <SlotPicker key={doctorId} doctorId={doctorId} />
        <label className="block md:col-span-2"><span className="label">Reason for visit (administrative)</span><input className="input" name="concern" /></label>
        <div className="md:col-span-4 space-y-2"><FormMessage state={state} /><Submit pendingText="Booking…">Book appointment</Submit></div>
      </form>
    </details>
  );
}

export function Reschedule({ id, doctorId }: { id: string; doctorId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(rescheduleAppointment, null);
  if (!open) return <button className="btn-ghost btn-sm mt-1" onClick={() => setOpen(true)}>Reschedule</button>;
  return (
    <form action={action} className="mt-2 grid w-64 gap-2">
      <input type="hidden" name="id" value={id} />
      <SlotPicker doctorId={doctorId} />
      <FormMessage state={state} />
      <Submit className="btn-outline btn-sm">Move booking</Submit>
    </form>
  );
}
