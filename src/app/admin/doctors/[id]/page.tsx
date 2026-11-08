import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { ActionForm } from "@/components/action-form";
import { Area, Field, PageHeader } from "@/components/ui";
import { addLeave, removeLeave, saveAvailability, updateDoctor } from "@/app/actions/admin";
import { SYSTEMS } from "@/lib/constants";
import { fmtDate } from "@/lib/format";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function ManageDoctor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("doctors:manage");
  const d = await db.doctor.findUnique({ where: { id }, include: { user: true, availability: { orderBy: { startTime: "asc" } }, leaves: { orderBy: { date: "asc" } } } });
  if (!d) notFound();
  const systems = d.systems.split(",");
  return (
    <div className="space-y-6">
      <PageHeader title={d.user.name} sub={`${d.code} · ${d.user.email}`} />
      <div className="card">
        <ActionForm action={updateDoctor} submit="Save profile">
          <input type="hidden" name="id" value={d.id} />
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Name" name="name" defaultValue={d.user.name} />
            <Field label="Qualifications" name="qualifications" defaultValue={d.qualifications} />
            <Field label="Specialisations" name="specialisations" defaultValue={d.specialisations} />
            <Field label="Professional registration no." name="registrationNo" defaultValue={d.registrationNo} />
            <Field label="Registering council / board" name="registrationBody" defaultValue={d.registrationBody} />
            <Field label="Experience (years)" name="experienceYears" type="number" defaultValue={d.experienceYears} />
            <Field label="Languages" name="languages" defaultValue={d.languages} />
            <Field label="Consultation fee (₹)" name="fee" type="number" defaultValue={d.fee} />
            <Field label="Follow-up fee (₹)" name="followUpFee" type="number" defaultValue={d.followUpFee} />
            <Field label="Slot duration (min)" name="slotMinutes" type="number" defaultValue={d.slotMinutes} />
            <Field label="Clinic location" name="clinicLocation" defaultValue={d.clinicLocation} className="md:col-span-2" />
          </div>
          <div className="flex flex-wrap gap-5 text-sm">
            {Object.entries(SYSTEMS).map(([k, v]) => <label key={k} className="flex items-center gap-1"><input type="checkbox" name="systems" value={k} defaultChecked={systems.includes(k)} /> {v}</label>)}
          </div>
          <div className="flex flex-wrap gap-5 text-sm">
            <label className="flex items-center gap-1"><input type="checkbox" name="inPersonAvailable" defaultChecked={d.inPersonAvailable} /> In-person</label>
            <label className="flex items-center gap-1"><input type="checkbox" name="onlineAvailable" defaultChecked={d.onlineAvailable} /> Online video</label>
            <label className="flex items-center gap-1"><input type="checkbox" name="phoneAvailable" defaultChecked={d.phoneAvailable} /> Telephone</label>
            <label className="flex items-center gap-1"><input type="checkbox" name="verified" defaultChecked={d.verified} /> Credentials verified</label>
            <label className="flex items-center gap-1"><input type="checkbox" name="active" defaultChecked={d.active} /> Active</label>
          </div>
          <p className="text-xs text-charcoal-500">Only tick “Credentials verified” after checking the registration with the relevant council. The public profile never claims a registration that has not been verified.</p>
          <Area label="Profile description" name="bio" defaultValue={d.bio} rows={4} />
        </ActionForm>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="section-title">Working hours</h2>
          <ActionForm action={saveAvailability} submit="Save hours" className="mt-3 space-y-2">
            <input type="hidden" name="doctorId" value={d.id} />
            {DAYS.map((day, wd) => {
              const blocks = d.availability.filter((a) => a.weekday === wd);
              return (
                <div key={wd} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="w-10 font-medium">{day}</span>
                  {[0, 1].map((b) => (
                    <span key={b} className="flex items-center gap-1">
                      <input className="input w-28 py-1" type="time" name={`s_${wd}_${b}`} defaultValue={blocks[b]?.startTime} />–
                      <input className="input w-28 py-1" type="time" name={`e_${wd}_${b}`} defaultValue={blocks[b]?.endTime} />
                    </span>
                  ))}
                </div>
              );
            })}
          </ActionForm>
        </div>
        <div className="card">
          <h2 className="section-title">Leave & holidays</h2>
          <form action={addLeave} className="mt-3 flex flex-wrap gap-2">
            <input type="hidden" name="doctorId" value={d.id} />
            <input className="input w-44" type="date" name="date" required />
            <input className="input flex-1" name="reason" placeholder="Reason (optional)" />
            <button className="btn-outline">Add leave</button>
          </form>
          <ul className="mt-3 space-y-1 text-sm">
            {d.leaves.map((l) => (
              <li key={l.id} className="flex justify-between"><span>{fmtDate(l.date)} {l.reason && <span className="text-charcoal-500">– {l.reason}</span>}</span>
                <form action={removeLeave}><input type="hidden" name="id" value={l.id} /><button className="text-xs text-red-700">Remove</button></form></li>
            ))}
            {!d.leaves.length && <li className="text-charcoal-500">No leave scheduled.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
