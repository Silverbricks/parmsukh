import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { BookingWizard } from "./wizard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Book Consultation" };

export default async function Book({ searchParams }: { searchParams: Promise<{ doctor?: string; system?: string; service?: string }> }) {
  const sp = await searchParams;
  const s = await getSession();
  const patient = s?.role === "PATIENT" ? await db.patient.findUnique({ where: { userId: s.uid } }) : null;
  const doctors = await db.doctor.findMany({ where: { active: true }, include: { user: true }, orderBy: { createdAt: "asc" } });
  return (
    <div className="container-p max-w-4xl py-10">
      <h1 className="text-4xl font-semibold">Book a consultation</h1>
      <p className="mt-1 text-sm text-charcoal-500">
        {patient ? <>Booking as <b>{patient.firstName} {patient.lastName}</b> ({patient.patientCode}).</> : "No account needed – verify your mobile number by OTP to confirm."}
      </p>
      <div className="mt-6">
        <BookingWizard
          loggedIn={!!patient}
          initial={{ doctorId: sp.doctor, system: sp.system, service: sp.service }}
          doctors={doctors.map((d) => ({
            id: d.id, name: d.user.name, systems: d.systems.split(","), fee: d.fee, followUpFee: d.followUpFee,
            modes: [d.inPersonAvailable && "IN_PERSON", d.onlineAvailable && "ONLINE", d.phoneAvailable && "PHONE"].filter(Boolean) as string[],
            specialisations: d.specialisations,
          }))}
        />
      </div>
    </div>
  );
}
