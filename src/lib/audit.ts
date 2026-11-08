import { db } from "./db";
import type { SessionPayload } from "./session";

export async function audit(
  s: Pick<SessionPayload, "uid" | "role"> | null,
  action: string, entity?: string, entityId?: string, meta?: Record<string, unknown>,
) {
  try {
    await db.auditLog.create({
      data: {
        userId: s?.uid ?? null, role: s?.role ?? "GUEST", action, entity, entityId,
        meta: meta ? JSON.stringify(meta) : null,
      },
    });
  } catch (e) {
    console.error("audit log failed", e);
  }
}
