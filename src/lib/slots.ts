import { db } from "./db";
import { istNow, weekday } from "./format";

const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export const slotKey = (doctorId: string, date: string, time: string) => `${doctorId}|${date}|${time}`;

/** Real-time available slots for a doctor on a date (IST). */
export async function availableSlots(doctorId: string, date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  const doctor = await db.doctor.findUnique({ where: { id: doctorId }, include: { availability: true, leaves: { where: { date } } } });
  if (!doctor || !doctor.active || doctor.leaves.length) return [];
  const holiday = await db.clinicSetting.findUnique({ where: { key: "holidays" } });
  if (holiday?.value.split(",").map((s) => s.trim()).includes(date)) return [];

  const now = istNow();
  if (date < now.date) return [];
  const wd = weekday(date);
  const blocks = doctor.availability.filter((a) => a.weekday === wd);
  const taken = new Set(
    (await db.appointment.findMany({ where: { doctorId, date, slotKey: { not: null } }, select: { time: true } })).map((a) => a.time),
  );
  const out: string[] = [];
  for (const b of blocks) {
    for (let m = toMin(b.startTime); m + doctor.slotMinutes <= toMin(b.endTime); m += doctor.slotMinutes) {
      const t = toTime(m);
      if (date === now.date && toMin(t) <= toMin(now.time) + 30) continue; // 30-min booking lead time
      if (!taken.has(t)) out.push(t);
    }
  }
  return out.sort();
}
