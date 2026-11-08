import { db } from "./db";

/**
 * Notification outbox. Messages must never include clinical details (SRS §19).
 * No SMS / email / WhatsApp provider is connected yet – messages are stored as QUEUED
 * so a delivery worker can be plugged in later.
 */
export async function notify(n: {
  userId?: string; mobile?: string; email?: string;
  channel: "SMS" | "EMAIL" | "WHATSAPP" | "IN_APP"; subject: string; message: string;
}) {
  await db.notification.create({ data: { ...n } });
}
