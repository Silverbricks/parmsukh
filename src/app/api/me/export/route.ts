import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

// Patient data export (SRS v3 §12). Excludes practitioner private notes, which remain under clinical control.
export async function GET() {
  const s = await getSession();
  if (!s || s.role !== "PATIENT") return new NextResponse("Unauthorised", { status: 401 });
  const p = await db.patient.findUnique({
    where: { userId: s.uid },
    include: {
      medicalHistory: true, complaints: true, consents: true, followUps: true,
      documents: { select: { title: true, kind: true, fileName: true, createdAt: true } },
      consultations: {
        where: { status: "COMPLETED", summaryApproved: true },
        select: { number: true, system: true, mode: true, completedAt: true, mainComplaint: true, patientSummary: true, referral: true, followUpDate: true },
      },
      prescriptions: { where: { approved: true }, include: { items: true } },
      appointments: { select: { ref: true, date: true, time: true, status: true, system: true, mode: true, fee: true, paymentStatus: true } },
    },
  });
  const orders = await db.order.findMany({ where: { userId: s.uid }, include: { items: true } });
  await audit(s, "DATA_EXPORT", "Patient", p?.id);
  return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), patient: p, orders }, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="parmsukh-${p?.patientCode}.json"`, "Cache-Control": "no-store" },
  });
}
