// Edge-safe session helpers (used by middleware and server code).
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "ps_session";
export type Role =
  | "SUPER_ADMIN" | "DOCTOR_ADMIN" | "DOCTOR" | "RECEPTIONIST"
  | "STORE_MANAGER" | "ORDER_MANAGER" | "PATIENT";

export type SessionPayload = { uid: string; role: Role; name: string };

export const ADMIN_PORTAL_ROLES: Role[] = ["SUPER_ADMIN", "DOCTOR_ADMIN", "RECEPTIONIST", "STORE_MANAGER", "ORDER_MANAGER"];

// Session timeout (SRS §12): staff sessions are short, patient sessions longer.
export const SESSION_HOURS: Record<Role, number> = {
  SUPER_ADMIN: 8, DOCTOR_ADMIN: 8, DOCTOR: 10, RECEPTIONIST: 10,
  STORE_MANAGER: 10, ORDER_MANAGER: 10, PATIENT: 24 * 7,
};

function key() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set (32+ chars)");
  return new TextEncoder().encode(s);
}

export async function signSession(p: SessionPayload) {
  return new SignJWT({ ...p })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS[p.role]}h`)
    .sign(key());
}

export async function verifySession(token?: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return { uid: String(payload.uid), role: payload.role as Role, name: String(payload.name ?? "") };
  } catch {
    return null;
  }
}
