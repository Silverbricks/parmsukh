import "server-only";
import { db } from "./db";

/**
 * Doctor-specific patient access (SRS v3 §12): a practitioner may open a patient's clinical record
 * only if they have an appointment or consultation with that patient, or registered the patient themselves.
 */
export async function doctorCanAccessPatient(doctorId: string, doctorUserId: string, patientId: string) {
  const [appt, consult, patient] = await Promise.all([
    db.appointment.findFirst({ where: { doctorId, patientId }, select: { id: true } }),
    db.consultation.findFirst({ where: { doctorId, patientId }, select: { id: true } }),
    db.patient.findUnique({ where: { id: patientId }, select: { createdById: true } }),
  ]);
  return !!appt || !!consult || patient?.createdById === doctorUserId;
}

/**
 * Find the patient record for a verified mobile, or create one. Used when converting a guest booking
 * or guest registration – guarantees one patient per mobile (no duplicates).
 */
export async function findOrCreatePatientByMobile(
  mobile: string,
  data: { firstName: string; lastName?: string; email?: string | null; dob?: string | null },
  createdById?: string,
) {
  const existing = await db.patient.findUnique({ where: { mobile } });
  if (existing) return existing;
  const { nextPatientCode } = await import("./ids");
  return db.patient.create({
    data: {
      patientCode: await nextPatientCode(), mobile, firstName: data.firstName, lastName: data.lastName ?? "",
      email: data.email ?? null, dob: data.dob ?? null, createdById: createdById ?? null,
    },
  });
}

/** Link guest bookings and guest orders made with this verified mobile to the patient record. */
export async function linkGuestRecords(patientId: string, userId: string, mobile: string) {
  const a = await db.appointment.updateMany({ where: { patientId: null, guestMobile: mobile, mobileVerified: true }, data: { patientId } });
  const o = await db.order.updateMany({ where: { userId: null, mobile, isGuest: true }, data: { userId, patientId } });
  return { appointments: a.count, orders: o.count };
}
