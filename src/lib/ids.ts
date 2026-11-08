import { randomInt } from "crypto";
import { db } from "./db";

async function next(name: string) {
  const c = await db.counter.upsert({ where: { name }, create: { name, value: 1 }, update: { value: { increment: 1 } } });
  return c.value;
}
export const nextPatientCode = async () => `PAR-${String(await next("patient")).padStart(6, "0")}`;
export const nextConsultationNo = async () => `CON-${String(await next("consultation")).padStart(6, "0")}`;
export const nextOrderNo = async () => `ORD-${260000 + (await next("order"))}`;
export const nextRxNo = async (kind: string) =>
  `${kind === "CLINICAL_PRESCRIPTION" ? "RX" : "WR"}-${String(await next("rx")).padStart(6, "0")}`;
export const nextDoctorCode = async () => `DOC-${String(await next("doctor")).padStart(3, "0")}`;

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function bookingRef() {
  let s = "APT-";
  for (let i = 0; i < 6; i++) s += ALPHA[randomInt(ALPHA.length)];
  return s;
}
