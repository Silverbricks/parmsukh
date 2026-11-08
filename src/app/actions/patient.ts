"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePatient } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { evaluateSafety } from "@/lib/safety";
import { categoryByKey, CONSENT_TYPES, DOCUMENT_KINDS } from "@/lib/constants";
import { storeUpload } from "@/lib/files";
import { notify } from "@/lib/notify";
import { istNow, num, optStr, str } from "@/lib/format";
import type { FormState } from "./auth";

export async function updateProfile(_: FormState, fd: FormData): Promise<FormState> {
  const { session, patient } = await requirePatient();
  const firstName = str(fd, "firstName");
  if (!firstName) return { error: "First name is required." };
  const pin = optStr(fd, "pinCode");
  if (pin && !/^\d{6}$/.test(pin)) return { error: "PIN code must be 6 digits." };
  await db.patient.update({
    where: { id: patient.id },
    data: {
      firstName, lastName: str(fd, "lastName"), dob: optStr(fd, "dob"), sex: optStr(fd, "sex"), genderIdentity: optStr(fd, "genderIdentity"),
      whatsapp: optStr(fd, "whatsapp"), email: optStr(fd, "email"), address: optStr(fd, "address"), city: optStr(fd, "city"),
      state: optStr(fd, "state"), pinCode: pin, language: optStr(fd, "language"), emergencyContact: optStr(fd, "emergencyContact"),
      occupation: optStr(fd, "occupation"), gpDetails: optStr(fd, "gpDetails"),
    },
  });
  await db.user.update({ where: { id: session.uid }, data: { name: `${firstName} ${str(fd, "lastName")}`.trim() } });
  await audit(session, "PATIENT_PROFILE_UPDATE", "Patient", patient.id);
  revalidatePath("/dashboard");
  return { message: "Profile saved." };
}

export async function saveMedicalHistory(_: FormState, fd: FormData): Promise<FormState> {
  const { session, patient } = await requirePatient();
  const data = {
    heightCm: num(fd, "heightCm"), weightKg: num(fd, "weightKg"), conditions: optStr(fd, "conditions"), allergies: optStr(fd, "allergies"),
    medications: optStr(fd, "medications"), surgeries: optStr(fd, "surgeries"), familyHistory: optStr(fd, "familyHistory"),
    sleep: optStr(fd, "sleep"), appetite: optStr(fd, "appetite"), digestion: optStr(fd, "digestion"), waterIntake: optStr(fd, "waterIntake"),
    exercise: optStr(fd, "exercise"), stressLevel: num(fd, "stressLevel"), smoking: optStr(fd, "smoking"), alcohol: optStr(fd, "alcohol"),
  };
  await db.medicalHistory.upsert({ where: { patientId: patient.id }, create: { patientId: patient.id, ...data }, update: data });
  await audit(session, "MEDICAL_HISTORY_UPDATE", "Patient", patient.id);
  revalidatePath("/dashboard/case-history");
  return { message: "Medical history saved." };
}

export async function submitComplaint(_: unknown, fd: FormData) {
  const { session, patient } = await requirePatient();
  const cat = categoryByKey(str(fd, "category"));
  const title = str(fd, "title");
  const symptoms = str(fd, "symptoms");
  if (!title || !symptoms) return { error: "Please select a concern and describe your symptoms." };
  if (cat.sensitive) {
    const c = await db.consent.findFirst({ where: { patientId: patient.id, type: "SENSITIVE_DATA" }, orderBy: { createdAt: "desc" } });
    if (!c?.granted && fd.get("sensitiveConsent") !== "on") return { error: "Please confirm consent to share sensitive health information with your practitioner." };
    if (!c?.granted) await db.consent.create({ data: { patientId: patient.id, type: "SENSITIVE_DATA", granted: true, source: "QUESTIONNAIRE" } });
  }
  const answers: Record<string, string> = {};
  const flags: string[] = [];
  for (const q of cat.questions) {
    const v = str(fd, `q_${q.id}`);
    if (v) answers[q.id] = v;
    if (q.redFlag && (v === "yes" || (q.id === "pregnant" && v === "Yes"))) flags.push(q.redFlag);
  }
  const safety = evaluateSafety({ text: `${title} ${symptoms}`, flags });
  const complaint = await db.healthComplaint.create({
    data: {
      patientId: patient.id, category: cat.key, sensitive: cat.sensitive, title, symptoms,
      startDate: optStr(fd, "startDate"), duration: optStr(fd, "duration"), frequency: optStr(fd, "frequency"),
      severity: num(fd, "severity"), previousTreatment: optStr(fd, "previousTreatment"), investigations: optStr(fd, "investigations"),
      answers: JSON.stringify(answers), redFlags: JSON.stringify(safety.map((r) => r.id)),
    },
  });
  await audit(session, "COMPLAINT_SUBMITTED", "HealthComplaint", complaint.id, { category: cat.key, flags: safety.map((r) => r.id) });
  revalidatePath("/dashboard/case-history");
  return { ok: true as const, safety: safety.map((r) => r.id) };
}

export async function uploadDocument(_: FormState, fd: FormData): Promise<FormState> {
  const { session, patient } = await requirePatient();
  const kind = str(fd, "kind");
  if (!(DOCUMENT_KINDS as readonly string[]).includes(kind)) return { error: "Choose a document type." };
  if (kind === "PHOTO") {
    const c = await db.consent.findFirst({ where: { patientId: patient.id, type: "PHOTOGRAPHS" }, orderBy: { createdAt: "desc" } });
    if (!c?.granted && fd.get("photoConsent") !== "on") return { error: "Please confirm consent to upload clinical photographs." };
    if (!c?.granted) await db.consent.create({ data: { patientId: patient.id, type: "PHOTOGRAPHS", granted: true, source: "UPLOAD" } });
  }
  const r = await storeUpload(fd.get("file") as File);
  if ("error" in r) return { error: r.error };
  const doc = await db.patientDocument.create({
    data: { patientId: patient.id, kind, title: str(fd, "title") || r.fileName, fileName: r.fileName, storedName: r.storedName, mimeType: r.mime, sizeBytes: r.size, uploadedBy: session.uid, uploaderRole: "PATIENT" },
  });
  await audit(session, "DOCUMENT_UPLOAD", "PatientDocument", doc.id);
  revalidatePath("/dashboard/documents");
  return { message: "Document uploaded securely." };
}

export async function submitFollowUpReport(_: FormState, fd: FormData): Promise<FormState> {
  const { session, patient } = await requirePatient();
  const id = str(fd, "followUpId");
  const f = await db.followUp.findFirst({ where: { id, patientId: patient.id } });
  if (!f) return { error: "Follow-up not found." };
  const report = str(fd, "patientReport");
  const newSymptoms = optStr(fd, "newSymptoms");
  const adverse = optStr(fd, "adverseEvents");
  await db.followUp.update({
    where: { id }, data: { patientReport: report, improvement: optStr(fd, "improvement"), newSymptoms, adverseEvents: adverse, reportedAt: new Date() },
  });
  await audit(session, "FOLLOWUP_REPORT", "FollowUp", id);
  const safety = evaluateSafety({ text: `${report} ${newSymptoms ?? ""} ${adverse ?? ""}` });
  revalidatePath("/dashboard/follow-ups");
  return safety.length
    ? { error: `Important: ${safety[0].title}. ${safety[0].action}` }
    : { message: "Thank you – your progress update has been shared with your practitioner." };
}

export async function cancelMyAppointment(fd: FormData) {
  const { session, patient } = await requirePatient();
  const id = str(fd, "id");
  const a = await db.appointment.findFirst({ where: { id, patientId: patient.id, status: { in: ["REQUESTED", "CONFIRMED"] } } });
  if (!a) return;
  if (a.date < istNow().date) return;
  await db.appointment.update({
    where: { id }, data: { status: "CANCELLED", slotKey: null, cancelReason: "Cancelled by patient", paymentStatus: a.paymentStatus === "PAID" ? "REFUND_REQUESTED" : a.paymentStatus },
  });
  await audit(session, "APPOINTMENT_CANCELLED", "Appointment", id);
  await notify({ mobile: patient.mobile, channel: "SMS", subject: "Booking cancelled", message: `PARMSUKH: booking ${a.ref} has been cancelled.` });
  revalidatePath("/dashboard/consultations");
}

export async function requestOrderAction(fd: FormData) {
  const { session } = await requirePatient();
  const id = str(fd, "id"), kind = str(fd, "kind");
  const o = await db.order.findFirst({ where: { id, userId: session.uid } });
  if (!o) return;
  if (kind === "cancel" && ["PENDING", "CONFIRMED"].includes(o.status)) {
    const { cancelOrderAndRestock } = await import("@/lib/orders");
    await cancelOrderAndRestock(o.id, session.uid, "Cancelled by customer");
  } else if (kind === "return" && o.status === "DELIVERED") {
    await db.order.update({ where: { id }, data: { status: "RETURN_REQUESTED", events: { create: { status: "RETURN_REQUESTED", note: "Return requested by customer", userId: session.uid } } } });
  }
  await audit(session, `ORDER_${kind.toUpperCase()}_REQUEST`, "Order", id);
  revalidatePath("/dashboard/orders");
}

export async function updateConsents(_: FormState, fd: FormData): Promise<FormState> {
  const { session, patient } = await requirePatient();
  const latest = await db.consent.findMany({ where: { patientId: patient.id }, orderBy: { createdAt: "desc" } });
  for (const type of Object.keys(CONSENT_TYPES)) {
    if (type === "PRIVACY_POLICY") continue;
    const granted = fd.get(type) === "on";
    const cur = latest.find((c) => c.type === type);
    if (!cur || cur.granted !== granted) await db.consent.create({ data: { patientId: patient.id, type, granted, source: "DASHBOARD" } });
  }
  await audit(session, "CONSENT_UPDATE", "Patient", patient.id);
  revalidatePath("/dashboard/privacy");
  return { message: "Your consent preferences have been updated." };
}

export async function requestCorrection(_: FormState, fd: FormData): Promise<FormState> {
  const { session, patient } = await requirePatient();
  const details = str(fd, "details");
  if (!details) return { error: "Please describe what needs correcting." };
  await notify({ channel: "IN_APP", subject: `Data correction request – ${patient.patientCode}`, message: details.slice(0, 1000) });
  await audit(session, "DATA_CORRECTION_REQUEST", "Patient", patient.id);
  return { message: "Your correction request has been sent to the clinic. We will respond within the period required by law." };
}

export async function saveAddress(fd: FormData) {
  const { session } = await requirePatient();
  const pin = str(fd, "pinCode");
  if (!/^\d{6}$/.test(pin) || !str(fd, "line1")) return;
  const isDefault = fd.get("isDefault") === "on";
  if (isDefault) await db.address.updateMany({ where: { userId: session.uid }, data: { isDefault: false } });
  await db.address.create({
    data: { userId: session.uid, label: str(fd, "label") || "Home", name: str(fd, "name"), mobile: str(fd, "mobile"), line1: str(fd, "line1"), line2: optStr(fd, "line2"), city: str(fd, "city"), state: str(fd, "state"), pinCode: pin, isDefault },
  });
  revalidatePath("/dashboard/profile");
}

export async function deleteAddress(fd: FormData) {
  const { session } = await requirePatient();
  await db.address.deleteMany({ where: { id: str(fd, "id"), userId: session.uid } });
  revalidatePath("/dashboard/profile");
}
