import { requirePermission } from "@/lib/auth";
import { PanelShell, type NavItem } from "@/components/panel";
import { can, ROLE_LABELS, type Permission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const NAV: (NavItem & { perm: Permission })[] = [
  { href: "/admin", label: "Dashboard", exact: true, perm: "admin:access" },
  { href: "/admin/appointments", label: "Appointments", perm: "appointments:manage" },
  { href: "/admin/patients", label: "Patient registry", perm: "patients:read" },
  { href: "/admin/doctors", label: "Doctors", perm: "doctors:manage" },
  { href: "/admin/staff", label: "Staff & permissions", perm: "staff:manage" },
  { href: "/admin/products", label: "Products & medicines", perm: "products:manage" },
  { href: "/admin/inventory", label: "Inventory & expiry", perm: "products:manage" },
  { href: "/admin/coupons", label: "Coupons", perm: "products:manage" },
  { href: "/admin/orders", label: "Orders & payments", perm: "orders:manage" },
  { href: "/admin/reports", label: "Reports & analytics", perm: "reports:view" },
  { href: "/admin/audit", label: "Audit logs", perm: "audit:view" },
  { href: "/admin/settings", label: "Clinic settings", perm: "clinic:manage" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await requirePermission("admin:access");
  return (
    <PanelShell portal="Doctor Admin" nav={NAV.filter((n) => can(s.role, n.perm))} user={{ name: s.name, sub: ROLE_LABELS[s.role] }}>
      {children}
    </PanelShell>
  );
}
