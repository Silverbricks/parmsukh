import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { doctorCanAccessPatient } from "@/lib/clinical";
import { readUpload } from "@/lib/files";
import { audit } from "@/lib/audit";

// Secure document download: only the patient themself or a practitioner with access to the patient.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSession();
  if (!s) return new NextResponse("Unauthorised", { status: 401 });
  const doc = await db.patientDocument.findUnique({ where: { id }, include: { patient: true } });
  if (!doc) return new NextResponse("Not found", { status: 404 });

  let allowed = false;
  if (s.role === "PATIENT") allowed = doc.patient.userId === s.uid;
  else if (s.role === "DOCTOR") {
    const d = await db.doctor.findUnique({ where: { userId: s.uid } });
    allowed = !!d && (await doctorCanAccessPatient(d.id, s.uid, doc.patientId));
  }
  if (!allowed) {
    await audit(s, "DOCUMENT_ACCESS_DENIED", "PatientDocument", id);
    return new NextResponse("Forbidden", { status: 403 });
  }
  await audit(s, "DOCUMENT_VIEW", "PatientDocument", id, { patientId: doc.patientId });
  const buf = await readUpload(doc.storedName);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename="${doc.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
