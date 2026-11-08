import { requirePatient } from "@/lib/auth";
import { PanelShell } from "@/components/panel";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/dashboard", label: "Overview", exact: true },
  { href: "/dashboard/profile", label: "My Profile" },
  { href: "/dashboard/case-history", label: "My Case History" },
  { href: "/dashboard/consultations", label: "My Consultations" },
  { href: "/book-consultation", label: "Book Consultation" },
  { href: "/dashboard/prescriptions", label: "My Prescriptions" },
  { href: "/dashboard/documents", label: "My Reports" },
  { href: "/dashboard/follow-ups", label: "My Follow-ups" },
  { href: "/dashboard/orders", label: "My Orders & Payments" },
  { href: "/dashboard/privacy", label: "Privacy & Consent" },
  { href: "/store", label: "Shop →" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { patient } = await requirePatient();
  return (
    <PanelShell portal="Patient Portal" nav={NAV} user={{ name: `${patient.firstName} ${patient.lastName}`.trim(), sub: patient.patientCode }}>
      {children}
    </PanelShell>
  );
}
