"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireDoctor } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { doctorCanAccessPatient, findOrCreatePatientByMobile } from "@/lib/clinical";
import { nextConsultationNo, nextPatientCode, nextRxNo } from "@/lib/ids";
import { normaliseMobile } from "@/lib/otp";
import { evaluateSafety } from "@/lib/safety";
import { notify } from "@/lib/notify";
import { storeUpload } from "@/lib/files";
import { DOCUMENT_KINDS, MODES, PROGRESS_STATUSES, SERVICES, SYSTEMS } from "@/lib/constants";
import { optStr, str } from "@/lib/format";
import type { FormState } from "./auth";

import { AYUR_FIELDS, HOMEO_FIELDS } from "@/lib/clinical-fields";

async function ownConsultation(id: string) {
  const { session, doctor } = await requireDoctor();
  const c = await db.consultation.findFirst({ where: { id, doctorId: doctor.id } });
  if (!c) redirect("/doctor");
  return { session, doctor, c };
}

export async function registerPatient(_: FormState, fd: FormData): Promise<FormState> {
  const { session } = await requireDoctor();
  const mobile = normaliseMobile(str(fd, "mobile"));
  const firstName = str(fd, "firstName");
  if (!mobile || !firstName) return { error: "Name and a valid mobile number are required." };
  const existing = await db.patient.findUnique({ where: { mobile } });
  if (existing) return { error: `A patient with this mobile already exists: ${existing.patientCode} (${existing.firstName} ${existing.lastName}).` };
  const p = await db.patient.create({
    data: {
      patientCode: await nextPatientCode(), mobile, firstName, lastName: str(fd, "lastName"), dob: optStr(fd, "dob"), sex: optStr(fd, "sex"),
      email: optStr(fd, "email"), city: optStr(fd, "city"), state: optStr(fd, "state"), address: optStr(fd, "address"), occupation: optStr(fd, "occupation"),
      createdById: session.uid,
    },
  });
  if (fd.get("consent") === "on") {
    for (const type of ["HEALTH_DATA", "PRIVACY_POLICY"]) await db.consent.create({ data: { patientId: p.id, type, granted: true, source: "CLINIC_PAPER" } });
  }
  await audit(session, "PATIENT_REGISTERED", "Patient", p.id);
  redirect(`/doctor/patients/${p.id}`);
}

export async function startConsultation(fd: FormData) {
  const { session, doctor } = await requireDoctor();
  const appointmentId = optStr(fd, "appointmentId");
  let patientId = optStr(fd, "patientId");
  let system = str(fd, "system"), type = str(fd, "type") || "INITIAL", mode = str(fd, "mode") || "IN_PERSON";
  let mainComplaint = "";

  if (appointmentId) {
    const a = await db.appointment.findFirst({ where: { id: appointmentId, doctorId: doctor.id }, include: { consultation: true } });
    if (!a) redirect("/doctor/appointments");
    if (a.consultation) redirect(`/doctor/consultations/${a.consultation.id}`);
    if (!a.patientId) {
      // Guest booking: attach to the (single) patient record for this verified mobile.
      const name = (a.guestName ?? "Guest").split(" ");
      const p = await findOrCreatePatientByMobile(a.guestMobile!, { firstName: name[0], lastName: name.slice(1).join(" "), email: a.guestEmail }, session.uid);
      await db.appointment.update({ where: { id: a.id }, data: { patientId: p.id } });
      patientId = p.id;
    } else patientId = a.patientId;
    system = a.system; mode = a.mode; type = a.service === "FOLLOW_UP" ? "FOLLOW_UP" : a.service;
    mainComplaint = a.concern ?? "";
  }
  if (!patientId || !(system in SYSTEMS)) redirect("/doctor/patients");
  if (!(type in SERVICES)) type = "INITIAL";
  if (!(mode in MODES)) mode = "IN_PERSON";

  const open = await db.consultation.findFirst({ where: { doctorId: doctor.id, patientId, status: "IN_PROGRESS", appointmentId: appointmentId ?? undefined } });
  if (open && !appointmentId) redirect(`/doctor/consultations/${open.id}`);

  const c = await db.consultation.create({
    data: {
      number: await nextConsultationNo(), appointmentId, patientId, doctorId: doctor.id, system, type, mode, mainComplaint,
      ...(system === "HOMOEOPATHY" ? { homeopathy: { create: { mainComplaint } } } : {}),
      ...(system === "AYURVEDA" ? { ayurveda: { create: {} } } : {}),
    },
  });
  await audit(session, "CONSULTATION_STARTED", "Consultation", c.id, { patientId });
  redirect(`/doctor/consultations/${c.id}`);
}

export async function saveConsultation(_: FormState, fd: FormData): Promise<FormState> {
  const { session, c } = await ownConsultation(str(fd, "id"));
  if (c.status === "COMPLETED" && fd.get("amend") !== "on") return { error: "This consultation is completed. Tick “amend completed record” to change it (the change is audited)." };

  const manualFlags = fd.getAll("flags").map(String);
  const text = ["subjective", "objective", "assessment", "mainComplaint"].map((k) => str(fd, k)).join(" ");
  const flags = [...new Set([...manualFlags, ...evaluateSafety({ text }).map((r) => r.id)])];

  await db.consultation.update({
    where: { id: c.id },
    data: {
      mainComplaint: str(fd, "mainComplaint"), subjective: str(fd, "subjective"), objective: str(fd, "objective"),
      assessment: str(fd, "assessment"), plan: str(fd, "plan"), privateNotes: str(fd, "privateNotes"),
      safetyFlags: JSON.stringify(flags), safetyScreened: fd.get("safetyScreened") === "on",
      referral: optStr(fd, "referral"), referralOutcome: optStr(fd, "referralOutcome"),
    },
  });
  if (c.system === "HOMOEOPATHY") {
    const data = Object.fromEntries(HOMEO_FIELDS.map(([k]) => [k, str(fd, `h_${k}`)]));
    await db.homeopathyRecord.upsert({ where: { consultationId: c.id }, create: { consultationId: c.id, ...data }, update: data });
  }
  if (c.system === "AYURVEDA") {
    const data = Object.fromEntries(AYUR_FIELDS.map(([k]) => [k, str(fd, `a_${k}`)]));
    await db.ayurvedaRecord.upsert({ where: { consultationId: c.id }, create: { consultationId: c.id, ...data }, update: data });
  }
  await audit(session, c.status === "COMPLETED" ? "CONSULTATION_AMENDED" : "CONSULTATION_UPDATED", "Consultation", c.id, { flags });
  revalidatePath(`/doctor/consultations/${c.id}`);
  return { message: flags.length ? `Saved. ${flags.length} safety flag(s) recorded – document the referral.` : "Saved." };
}

export async function addPrescription(_: FormState, fd: FormData): Promise<FormState> {
  const { session, doctor, c } = await ownConsultation(str(fd, "consultationId"));
  const kind = str(fd, "kind") === "CLINICAL_PRESCRIPTION" ? "CLINICAL_PRESCRIPTION" : "WELLNESS_RECOMMENDATION";
  const items: { productId: string | null; name: string; potency: string; dosage: string; frequency: string; duration: string; notes: string }[] = [];
  for (let i = 0; i < 6; i++) {
    const productId = optStr(fd, `product_${i}`);
    let name = str(fd, `name_${i}`);
    if (productId && !name) name = (await db.product.findUnique({ where: { id: productId } }))?.name ?? "";
    if (!name) continue;
    items.push({ productId, name, potency: str(fd, `potency_${i}`), dosage: str(fd, `dosage_${i}`), frequency: str(fd, `frequency_${i}`), duration: str(fd, `duration_${i}`), notes: str(fd, `notes_${i}`) });
  }
  if (!items.length) return { error: "Add at least one medicine, remedy or recommendation." };
  const approve = fd.get("approve") === "on";
  const rx = await db.prescription.create({
    data: {
      number: await nextRxNo(kind), kind, consultationId: c.id, patientId: c.patientId, doctorId: doctor.id,
      instructions: str(fd, "instructions"), precautions: str(fd, "precautions"), validUntil: optStr(fd, "validUntil"),
      approved: approve, approvedAt: approve ? new Date() : null, items: { create: items },
    },
  });
  await audit(session, "PRESCRIPTION_CREATED", "Prescription", rx.id, { approved: approve, kind });
  revalidatePath(`/doctor/consultations/${c.id}`);
  return { message: `${rx.number} saved${approve ? " and approved" : " as draft"}.` };
}

export async function setPrescriptionApproval(fd: FormData) {
  const { session, doctor } = await requireDoctor();
  const rx = await db.prescription.findFirst({ where: { id: str(fd, "id"), doctorId: doctor.id } });
  if (!rx) return;
  if (str(fd, "op") === "delete") {
    if (!rx.approved) await db.prescription.delete({ where: { id: rx.id } });
  } else {
    const approve = str(fd, "op") === "approve";
    await db.prescription.update({ where: { id: rx.id }, data: { approved: approve, approvedAt: approve ? new Date() : null } });
  }
  await audit(session, `PRESCRIPTION_${str(fd, "op").toUpperCase()}`, "Prescription", rx.id);
  revalidatePath(`/doctor/consultations/${rx.consultationId}`);
}

export async function completeConsultation(_: FormState, fd: FormData): Promise<FormState> {
  const { session, c } = await ownConsultation(str(fd, "id"));
  const summary = str(fd, "patientSummary");
  const approve = fd.get("summaryApproved") === "on";
  if (approve && !summary) return { error: "Write the patient summary before approving it for release." };
  const flags: string[] = JSON.parse(c.safetyFlags || "[]");
  if (!c.safetyScreened) return { error: "Complete and tick the safety screening in the clinical documentation before completing." };
  if (flags.length && !c.referral) return { error: "Safety flags are recorded – document the referral advice before completing." };
  const followUpDate = optStr(fd, "followUpDate");
  const progress = optStr(fd, "progressStatus");
  await db.consultation.update({
    where: { id: c.id },
    data: {
      patientSummary: summary, summaryApproved: approve, followUpDate,
      progressStatus: progress && (PROGRESS_STATUSES as readonly string[]).includes(progress) ? progress : null,
      status: "COMPLETED", completedAt: c.completedAt ?? new Date(),
    },
  });
  if (c.appointmentId) await db.appointment.update({ where: { id: c.appointmentId }, data: { status: "COMPLETED" } });
  if (followUpDate && !(await db.followUp.findFirst({ where: { consultationId: c.id } })))
    await db.followUp.create({ data: { patientId: c.patientId, consultationId: c.id, dueDate: followUpDate } });
  // Close any earlier follow-ups now that the patient has been seen.
  await db.followUp.updateMany({ where: { patientId: c.patientId, status: "DUE", consultationId: { not: c.id } }, data: { status: "DONE" } });
  const patient = await db.patient.findUnique({ where: { id: c.patientId } });
  if (approve && patient) await notify({ mobile: patient.mobile, channel: "SMS", subject: "Report available", message: "PARMSUKH: your consultation summary is now available in your patient dashboard." });
  await audit(session, "CONSULTATION_COMPLETED", "Consultation", c.id, { summaryApproved: approve });
  revalidatePath(`/doctor/consultations/${c.id}`);
  return { message: approve ? "Consultation completed and summary released to the patient." : "Consultation completed. Summary not yet released to the patient." };
}

export async function updateAppointment(fd: FormData) {
  const { session, doctor } = await requireDoctor();
  const a = await db.appointment.findFirst({ where: { id: str(fd, "id"), doctorId: doctor.id } });
  if (!a) return;
  const op = str(fd, "op");
  if (op === "confirm") await db.appointment.update({ where: { id: a.id }, data: { status: "CONFIRMED" } });
  if (op === "no_show") await db.appointment.update({ where: { id: a.id }, data: { status: "NO_SHOW" } });
  if (op === "video") {
    const link = str(fd, "videoLink");
    if (/^https:\/\//.test(link)) await db.appointment.update({ where: { id: a.id }, data: { videoLink: link } });
  }
  await audit(session, `APPOINTMENT_${op.toUpperCase()}`, "Appointment", a.id);
  revalidatePath("/doctor/appointments");
  revalidatePath("/doctor");
}

export async function doctorUploadDocument(_: FormState, fd: FormData): Promise<FormState> {
  const { session, doctor } = await requireDoctor();
  const patientId = str(fd, "patientId");
  if (!(await doctorCanAccessPatient(doctor.id, session.uid, patientId))) return { error: "No access to this patient." };
  const kind = str(fd, "kind");
  if (!(DOCUMENT_KINDS as readonly string[]).includes(kind)) return { error: "Choose a document type." };
  const r = await storeUpload(fd.get("file") as File);
  if ("error" in r) return { error: r.error };
  const doc = await db.patientDocument.create({
    data: { patientId, consultationId: optStr(fd, "consultationId"), kind, title: str(fd, "title") || r.fileName, fileName: r.fileName, storedName: r.storedName, mimeType: r.mime, sizeBytes: r.size, uploadedBy: session.uid, uploaderRole: "DOCTOR" },
  });
  await audit(session, "DOCUMENT_UPLOAD", "PatientDocument", doc.id);
  revalidatePath(`/doctor/patients/${patientId}`);
  return { message: "Document uploaded." };
}
