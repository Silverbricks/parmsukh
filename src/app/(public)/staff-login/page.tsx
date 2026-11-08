import { StaffLoginForm } from "./form";

export const metadata = { title: "Doctor & Staff Login" };

export default async function StaffLogin({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="container-p max-w-md py-12">
      <div className="card">
        <h1 className="text-3xl font-semibold">Doctor &amp; staff login</h1>
        <p className="mt-1 text-sm text-charcoal-500">Doctor Panel, Doctor Admin and staff portals.</p>
        <div className="mt-6"><StaffLoginForm next={next ?? ""} /></div>
      </div>
      {process.env.DEV_SHOW_OTP === "true" && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
          <b>Development demo accounts</b> (password <code>Parmsukh@123</code>):<br />
          dr.darshan@parmsukh.com – Doctor<br />admin@parmsukh.com – Doctor Admin<br />superadmin@parmsukh.com – Super Admin<br />
          reception@parmsukh.com · store@parmsukh.com · orders@parmsukh.com<br />
          Patient: mobile 9876543210 via /login (OTP shown on screen)
        </div>
      )}
    </div>
  );
}
