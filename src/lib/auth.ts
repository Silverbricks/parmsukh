import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { SESSION_COOKIE, SESSION_HOURS, signSession, verifySession, type Role, type SessionPayload } from "./session";
import { can, type Permission } from "./rbac";

export async function getSession(): Promise<SessionPayload | null> {
  const c = await cookies();
  return verifySession(c.get(SESSION_COOKIE)?.value);
}

export async function startSession(user: { id: string; role: string; name: string }) {
  const role = user.role as Role;
  const token = await signSession({ uid: user.id, role, name: user.name });
  const c = await cookies();
  c.set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: SESSION_HOURS[role] * 3600,
  });
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
}

export async function endSession() {
  const c = await cookies();
  c.delete(SESSION_COOKIE);
}

/** Require a permission; redirects to login otherwise. Re-checks that the account is still active. */
export async function requirePermission(perm: Permission, loginPath = "/staff-login") {
  const s = await getSession();
  if (!s || !can(s.role, perm)) redirect(loginPath);
  const user = await db.user.findUnique({ where: { id: s.uid } });
  if (!user || !user.active) redirect(loginPath);
  return s;
}

export async function requireDoctor() {
  const s = await requirePermission("doctor:panel");
  const doctor = await db.doctor.findUnique({ where: { userId: s.uid } });
  if (!doctor || !doctor.active) redirect("/staff-login");
  return { session: s, doctor };
}

export async function requirePatient() {
  const s = await getSession();
  if (!s || s.role !== "PATIENT") redirect("/login");
  const patient = await db.patient.findUnique({ where: { userId: s.uid } });
  if (!patient) redirect("/login");
  return { session: s, patient };
}
