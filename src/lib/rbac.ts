import type { Role } from "./session";

// Doctor Admin manages the clinic but does NOT automatically read clinical notes (SRS v3 §1).
// Clinical read/write is granted only to practitioners, and only for their own patients (see clinical.ts).
export type Permission =
  | "admin:access" | "doctors:manage" | "staff:manage" | "clinic:manage"
  | "products:manage" | "orders:manage" | "appointments:manage"
  | "patients:read" | "patients:create" | "reports:view" | "audit:view"
  | "doctor:panel" | "clinical:read" | "clinical:write" | "patient:portal";

const ADMIN_ALL: Permission[] = [
  "admin:access", "doctors:manage", "staff:manage", "clinic:manage", "products:manage",
  "orders:manage", "appointments:manage", "patients:read", "patients:create",
  "reports:view", "audit:view",
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: ADMIN_ALL,
  DOCTOR_ADMIN: ADMIN_ALL.filter((p) => p !== "audit:view"),
  DOCTOR: ["doctor:panel", "clinical:read", "clinical:write", "patients:read", "patients:create"],
  RECEPTIONIST: ["admin:access", "appointments:manage", "patients:read", "patients:create"],
  STORE_MANAGER: ["admin:access", "products:manage"],
  ORDER_MANAGER: ["admin:access", "orders:manage"],
  PATIENT: ["patient:portal"],
};

export function can(role: Role | undefined | null, perm: Permission) {
  return !!role && ROLE_PERMISSIONS[role].includes(perm);
}

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin", DOCTOR_ADMIN: "Doctor Admin", DOCTOR: "Doctor / Practitioner",
  RECEPTIONIST: "Receptionist", STORE_MANAGER: "Pharmacy / Store Manager",
  ORDER_MANAGER: "Order Manager", PATIENT: "Patient",
};
