"use server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { availableSlots, slotKey } from "@/lib/slots";
import { normaliseMobile, verifyOtp } from "@/lib/otp";
import { bookingRef } from "@/lib/ids";
import { evaluateSafety } from "@/lib/safety";
import { couponDiscount, findCoupon } from "@/lib/pricing";
import { notify } from "@/lib/notify";
import { audit } from "@/lib/audit";
import { MODES, SERVICES, SYSTEMS } from "@/lib/constants";
import { fmtDate, str } from "@/lib/format";

export async function getSlots(doctorId: string, date: string) {
  return availableSlots(doctorId, date);
}

export async function previewCoupon(code: string, fee: number) {
  const c = await findCoupon(code, "CONSULTATION");
  if (!c) return { ok: false, discount: 0 };
  return { ok: true, discount: couponDiscount(fee, c) };
}

export type BookingState =
  | null
  | { error: string }
  | { ok: true; ref: string; date: string; time: string; doctor: string; mode: string; total: number; paid: boolean; safety: string[]; guest: boolean };

export async function bookConsultation(_: BookingState, fd: FormData): Promise<BookingState> {
  const s = await getSession();
  const doctorId = str(fd, "doctorId"), date = str(fd, "date"), time = str(fd, "time");
  const system = str(fd, "system"), service = str(fd, "service"), mode = str(fd, "mode");
  const concern = str(fd, "concern").slice(0, 2000);
  const paymentMethod = str(fd, "paymentMethod") === "ONLINE_MOCK" ? "ONLINE_MOCK" : "PAY_AT_CLINIC";

  if (!(system in SYSTEMS) || !(service in SERVICES) || !(mode in MODES)) return { error: "Please complete all booking steps." };
  if (mode !== "IN_PERSON" && fd.get("teleconsent") !== "on") return { error: "Please accept the teleconsultation consent for online / phone consultations." };
  const doctor = await db.doctor.findUnique({ where: { id: doctorId }, include: { user: true } });
  if (!doctor || !doctor.active) return { error: "Selected doctor is not available." };
  if ((mode === "ONLINE" && !doctor.onlineAvailable) || (mode === "IN_PERSON" && !doctor.inPersonAvailable) || (mode === "PHONE" && !doctor.phoneAvailable))
    return { error: "This consultation mode is not offered by the selected doctor." };
  if (!(await availableSlots(doctorId, date)).includes(time)) return { error: "That time slot is no longer available. Please choose another." };

  // Identify the person booking
  let patientId: string | null = null, guestName: string | null = null, guestMobile: string | null = null, guestEmail: string | null = null;
  let mobileVerified = false;
  let notifyMobile: string;
  if (s?.role === "PATIENT") {
    const p = await db.patient.findUnique({ where: { userId: s.uid } });
    if (!p) return { error: "Patient profile not found." };
    patientId = p.id; mobileVerified = true; notifyMobile = p.mobile;
  } else {
    const mobile = normaliseMobile(str(fd, "mobile"));
    guestName = str(fd, "name");
    if (!guestName) return { error: "Please enter your name." };
    if (!mobile) return { error: "Please enter a valid mobile number." };
    const v = await verifyOtp(mobile, "GUEST_BOOKING", str(fd, "otp"));
    if (!v.ok) return { error: v.error };
    guestMobile = mobile; guestEmail = str(fd, "email") || null; mobileVerified = true; notifyMobile = mobile;
  }

  const fee = service === "FOLLOW_UP" && doctor.followUpFee ? doctor.followUpFee : doctor.fee;
  const coupon = await findCoupon(str(fd, "coupon"), "CONSULTATION");
  const discount = couponDiscount(fee, coupon);
  const safety = evaluateSafety({ text: concern }).map((r) => r.id);

  let appt;
  try {
    appt = await db.appointment.create({
      data: {
        ref: bookingRef(), doctorId, patientId, guestName, guestMobile, guestEmail, mobileVerified,
        system, service, mode, date, time, slotKey: slotKey(doctorId, date, time),
        status: "CONFIRMED", concern, fee, discount, couponCode: coupon?.code ?? null,
        paymentMethod, paymentStatus: paymentMethod === "ONLINE_MOCK" ? "PAID" : "PENDING",
      },
    });
  } catch (e) {
    // Unique slotKey guarantees two patients cannot book the same doctor and time.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: "Sorry – that slot was just booked by someone else. Please choose another time." };
    throw e;
  }
  if (paymentMethod === "ONLINE_MOCK") {
    await db.payment.create({ data: { kind: "APPOINTMENT", refId: appt.id, amount: fee - discount, method: "ONLINE_MOCK", status: "PAID", gatewayRef: `MOCK-${appt.ref}` } });
  }
  await notify({ mobile: notifyMobile, channel: "SMS", subject: "Booking confirmed", message: `PARMSUKH: your consultation ${appt.ref} is confirmed for ${fmtDate(date)} at ${time}.` });
  await audit(s, "APPOINTMENT_BOOKED", "Appointment", appt.id, { guest: !patientId });

  return {
    ok: true, ref: appt.ref, date, time, doctor: doctor.user.name, mode: MODES[mode as keyof typeof MODES],
    total: fee - discount, paid: paymentMethod === "ONLINE_MOCK", safety, guest: !patientId,
  };
}
