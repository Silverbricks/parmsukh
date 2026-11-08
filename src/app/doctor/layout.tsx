import { requireDoctor } from "@/lib/auth";
import { PanelShell } from "@/components/panel";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/doctor", label: "Dashboard", exact: true },
  { href: "/doctor/appointments", label: "Appointments" },
  { href: "/doctor/patients", label: "Patients" },
  { href: "/doctor/patients/new", label: "Register patient", exact: true },
  { href: "/doctor/consultations", label: "Consultations" },
];

export default async function DoctorLayout({ children }: { children: React.ReactNode }) {
  const { session, doctor } = await requireDoctor();
  return <PanelShell portal="Doctor Panel" nav={NAV} user={{ name: session.name, sub: doctor.code }}>{children}</PanelShell>;
}
