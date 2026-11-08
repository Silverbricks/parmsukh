import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { ActionForm } from "@/components/action-form";
import { Badge, Field, PageHeader, Select } from "@/components/ui";
import { createStaff, resetStaffPassword, toggleUser } from "@/app/actions/admin";
import { ROLE_LABELS, ROLE_PERMISSIONS } from "@/lib/rbac";
import type { Role } from "@/lib/session";
import { fmtDateTime } from "@/lib/format";

export default async function Staff() {
  const s = await requirePermission("staff:manage");
  const users = await db.user.findMany({ where: { role: { not: "PATIENT" } }, orderBy: [{ role: "asc" }, { name: "asc" }] });
  const roles: Role[] = ["DOCTOR_ADMIN", "RECEPTIONIST", "STORE_MANAGER", "ORDER_MANAGER", ...(s.role === "SUPER_ADMIN" ? ["SUPER_ADMIN" as Role] : [])];
  const activity = await db.auditLog.groupBy({ by: ["userId"], _max: { createdAt: true }, _count: true, where: { userId: { in: users.map((u) => u.id) } } });
  return (
    <div className="space-y-6">
      <PageHeader title="Staff & permissions" sub="Doctors are added from the Doctors page." />
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Last login</th><th>Actions logged</th><th>Status</th><th /></tr></thead>
          <tbody>{users.map((u) => {
            const a = activity.find((x) => x.userId === u.id);
            return (
              <tr key={u.id}>
                <td>{u.name}</td><td>{ROLE_LABELS[u.role as Role]}</td><td>{u.email}</td><td>{fmtDateTime(u.lastLoginAt)}</td><td>{a?._count ?? 0}</td>
                <td>{u.active ? <Badge s="CONFIRMED" text="Active" /> : <Badge s="CANCELLED" text="Disabled" />}</td>
                <td>{u.id !== s.uid && <form action={toggleUser}><input type="hidden" name="id" value={u.id} /><button className="btn-ghost btn-sm">{u.active ? "Deactivate" : "Activate"}</button></form>}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="section-title">Add staff member</h2>
          <ActionForm action={createStaff} submit="Create account" resetOnSuccess className="mt-3 space-y-3">
            <Field label="Name" name="name" required />
            <Field label="Email" name="email" type="email" required />
            <Select label="Role" name="role" required options={roles.map((r) => [r, ROLE_LABELS[r]] as [string, string])} />
            <Field label="Initial password (min 10 chars)" name="password" type="password" required minLength={10} />
          </ActionForm>
        </div>
        <div className="card">
          <h2 className="section-title">Reset a password</h2>
          <ActionForm action={resetStaffPassword} submit="Reset password" resetOnSuccess className="mt-3 space-y-3">
            <Select label="Account" name="id" required options={users.map((u) => [u.id, `${u.name} (${ROLE_LABELS[u.role as Role]})`] as [string, string])} />
            <Field label="New password" name="password" type="password" required minLength={10} />
          </ActionForm>
          <h3 className="mt-6 font-semibold">Role permissions</h3>
          <ul className="mt-2 space-y-1 text-xs">
            {(Object.keys(ROLE_PERMISSIONS) as Role[]).filter((r) => r !== "PATIENT").map((r) => <li key={r}><b>{ROLE_LABELS[r]}:</b> {ROLE_PERMISSIONS[r].join(", ")}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}
