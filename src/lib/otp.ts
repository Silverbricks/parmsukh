import "server-only";
import { createHash, randomBytes, randomInt } from "crypto";
import { db } from "./db";
import { notify } from "./notify";

const TTL_MIN = 10;
const MAX_ATTEMPTS = 5;
const hash = (mobile: string, code: string) =>
  createHash("sha256").update(`${mobile}:${code}:${process.env.AUTH_SECRET}`).digest("hex");

export function normaliseMobile(input: string) {
  const d = (input || "").replace(/\D/g, "");
  const m = d.length === 12 && d.startsWith("91") ? d.slice(2) : d;
  return /^[6-9]\d{9}$/.test(m) ? m : null;
}

export async function sendOtp(mobile: string, purpose: string) {
  // Rate limit: max 5 OTPs per mobile per 15 minutes.
  const recent = await db.otpVerification.count({ where: { mobile, createdAt: { gt: new Date(Date.now() - 15 * 60_000) } } });
  if (recent >= 5) return { ok: false as const, error: "Too many OTP requests. Please wait a few minutes." };
  const code = String(randomInt(100000, 1000000));
  await db.otpVerification.create({
    data: { mobile, purpose, codeHash: hash(mobile, code), expiresAt: new Date(Date.now() + TTL_MIN * 60_000) },
  });
  await notify({ mobile, channel: "SMS", subject: "OTP", message: `Your PARMSUKH verification code is ${code}. Valid for ${TTL_MIN} minutes.` });
  const devOtp = process.env.DEV_SHOW_OTP === "true" ? code : undefined;
  if (devOtp) console.log(`[DEV OTP] ${mobile} (${purpose}): ${code}`);
  return { ok: true as const, devOtp };
}

/** Verifies the latest OTP and returns a one-time token proving the mobile was verified. */
export async function verifyOtp(mobile: string, purpose: string, code: string) {
  const rec = await db.otpVerification.findFirst({
    where: { mobile, purpose, verifiedAt: null }, orderBy: { createdAt: "desc" },
  });
  if (!rec || rec.expiresAt < new Date()) return { ok: false as const, error: "OTP expired. Please request a new one." };
  if (rec.attempts >= MAX_ATTEMPTS) return { ok: false as const, error: "Too many attempts. Request a new OTP." };
  if (rec.codeHash !== hash(mobile, code.trim())) {
    await db.otpVerification.update({ where: { id: rec.id }, data: { attempts: { increment: 1 } } });
    return { ok: false as const, error: "Incorrect OTP." };
  }
  const token = randomBytes(24).toString("hex");
  await db.otpVerification.update({ where: { id: rec.id }, data: { verifiedAt: new Date(), token } });
  return { ok: true as const, token };
}

/** Consumes a verification token (valid 30 minutes after verification). Returns the verified mobile. */
export async function consumeOtpToken(token: string | undefined | null, purposes: string[]) {
  if (!token) return null;
  const rec = await db.otpVerification.findUnique({ where: { token } });
  if (!rec || rec.consumedAt || !rec.verifiedAt || !purposes.includes(rec.purpose)) return null;
  if (rec.verifiedAt.getTime() < Date.now() - 30 * 60_000) return null;
  await db.otpVerification.update({ where: { id: rec.id }, data: { consumedAt: new Date() } });
  return rec.mobile;
}
