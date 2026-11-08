import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { Badge, PageHeader } from "@/components/ui";
import { inr } from "@/lib/format";

export default async function AdminDoctors() {
  await requirePermission("doctors:manage");
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const doctors = await db.doctor.findMany({ include: { user: true }, orderBy: { createdAt: "asc" } });
  const stats = await Promise.all(doctors.map(async (d) => {
    const [appts, completed, revenue] = await Promise.all([
      db.appointment.count({ where: { doctorId: d.id, createdAt: { gte: monthStart } } }),
      db.consultation.count({ where: { doctorId: d.id, status: "COMPLETED", completedAt: { gte: monthStart } } }),
      db.appointment.aggregate({ _sum: { fee: true, discount: true }, where: { doctorId: d.id, paymentStatus: "PAID" } }),
    ]);
    return { appts, completed, revenue: (revenue._sum.fee ?? 0) - (revenue._sum.discount ?? 0) };
  }));
  return (
    <div className="space-y-6">
      <PageHeader title="Doctors" actions={<Link href="/admin/doctors/new" className="btn-primary">Add doctor</Link>} />
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>ID</th><th>Doctor</th><th>Therapies</th><th>Fee</th><th>Bookings (month)</th><th>Completed (month)</th><th>Revenue (paid)</th><th>Status</th><th /></tr></thead>
          <tbody>{doctors.map((d, i) => (
            <tr key={d.id}>
              <td className="font-mono text-xs">{d.code}</td>
              <td>{d.user.name}<div className="text-xs text-charcoal-500">{d.user.email}</div></td>
              <td className="text-xs">{d.systems.split(",").join(", ")}</td>
              <td>{inr(d.fee)}</td><td>{stats[i].appts}</td><td>{stats[i].completed}</td><td>{inr(stats[i].revenue)}</td>
              <td className="space-x-1">{d.active ? <Badge s="CONFIRMED" text="Active" /> : <Badge s="CANCELLED" text="Inactive" />}{d.verified ? <Badge s="PAID" text="Verified" /> : <Badge s="PENDING" text="Unverified" />}</td>
              <td><Link href={`/admin/doctors/${d.id}`} className="text-forest-700 underline">Manage</Link></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
