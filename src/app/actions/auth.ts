"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { endSession, getSession, startSession } from "@/lib/auth";
import { normaliseMobile, sendOtp, verifyOtp } from "@/lib/otp";
import { audit } from "@/lib/audit";
import { findOrCreatePatientByMobile, linkGuestRecords } from "@/lib/clinical";
import { CONSENT_TYPES } from "@/lib/constants";
import { str } from "@/lib/format";

const PURPOSES = ["LOGIN", "REGISTER", "GUEST_BOOKING", "GUEST_ORDER", "TRACK_ORDER"];

export async function requestOtp(mobileRaw: string, purpose: string) {
  const mobile = normaliseMobile(mobileRaw);
  if (!mobile) return { ok: false, error: "Enter a valid 10-digit Indian mobile number." };
  if (!PURPOSES.includes(purpose)) return { ok: false, error: "Invalid request." };
  if (purpose === "LOGIN") {
    const u = await db.user.findUnique({ where: { mobile } });
    if (!u || u.role !== "PATIENT") return { ok: false, error: "No patient account found for this number. Please register or continue as guest." };
  }
  if (purpose === "REGISTER") {
    const u = await db.user.findUnique({ where: { mobile } });
    if (u) return { ok: false, error: "An account already exists for this number. Please log in." };
  }
  const r = await sendOtp(mobile, purpose);
  return r.ok ? { ok: true, devOtp: r.devOtp } : { ok: false, error: r.error };
}

export type FormState = { error?: string; ok?: boolean; message?: string } | null;

export async function patientLogin(_: FormState, fd: FormData): Promise<FormState> {
  const mobile = normaliseMobile(str(fd, "mobile"));
  if (!mobile) return { error: "Enter a valid mobile number." };
  const v = await verifyOtp(mobile, "LOGIN", str(fd, "otp"));
  if (!v.ok) return { error: v.error };
  const user = await db.user.findUnique({ where: { mobile }, include: { patient: true } });
  if (!user || user.role !== "PATIENT" || !user.active) return { error: "Account not available." };
  await startSession(user);
  if (user.patient) await linkGuestRecords(user.patient.id, user.id, mobile);
  await audit({ uid: user.id, role: "PATIENT" }, "LOGIN", "User", user.id);
  const next = str(fd, "next");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
}

export async function patientRegister(_: FormState, fd: FormData): Promise<FormState> {
  const mobile = normaliseMobile(str(fd, "mobile"));
  const firstName = str(fd, "firstName");
  const dob = str(fd, "dob");
  if (!mobile) return { error: "Enter a valid mobile number." };
  if (!firstName) return { error: "First name is required." };
  if (!dob) return { error: "Date of birth is required." };
  if (fd.get("consent_PRIVACY_POLICY") !== "on" || fd.get("consent_HEALTH_DATA") !== "on")
    return { error: "Please accept the privacy policy and health-data consent to create an account." };
  if (await db.user.findUnique({ where: { mobile } })) return { error: "An account already exists for this number. Please log in." };
  const name = `${firstName} ${str(fd, "lastName")}`.trim();
  const email = str(fd, "email").toLowerCase() || null;
  if (email && (await db.user.findUnique({ where: { email } }))) return { error: "This email is already in use." };
  const v = await verifyOtp(mobile, "REGISTER", str(fd, "otp"));
  if (!v.ok) return { error: v.error };

  const user = await db.user.create({ data: { role: "PATIENT", name, mobile, email } });
  // Re-use an existing patient record (e.g. registered at reception or from a guest booking) – no duplicates.
  const patient = await findOrCreatePatientByMobile(mobile, { firstName, lastName: str(fd, "lastName"), email, dob });
  await db.patient.update({ where: { id: patient.id }, data: { userId: user.id, dob: patient.dob ?? dob, email: patient.email ?? email } });
  for (const type of Object.keys(CONSENT_TYPES)) {
    await db.consent.create({ data: { patientId: patient.id, mobile, type, granted: fd.get(`consent_${type}`) === "on", source: "REGISTRATION" } });
  }
  await linkGuestRecords(patient.id, user.id, mobile);
  await startSession(user);
  await audit({ uid: user.id, role: "PATIENT" }, "REGISTER", "Patient", patient.id);
  redirect("/dashboard?welcome=1");
}

export async function staffLogin(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  const ok = user?.passwordHash && (await bcrypt.compare(str(fd, "password"), user.passwordHash));
  if (!user || !ok || user.role === "PATIENT") {
    await audit(null, "LOGIN_FAILED", "User", undefined, { email });
    return { error: "Invalid email or password." };
  }
  if (!user.active) return { error: "This account has been deactivated." };
  await startSession(user);
  await audit({ uid: user.id, role: user.role as never }, "LOGIN", "User", user.id);
  const next = str(fd, "next");
  if (/^\/doctor(\/|$)/.test(next) && user.role === "DOCTOR") redirect(next);
  if (/^\/admin(\/|$)/.test(next) && user.role !== "DOCTOR") redirect(next);
  redirect(user.role === "DOCTOR" ? "/doctor" : "/admin");
}

export async function logout() {
  const s = await getSession();
  if (s) await audit(s, "LOGOUT", "User", s.uid);
  await endSession();
  redirect(s && s.role !== "PATIENT" ? "/staff-login" : "/");
}
