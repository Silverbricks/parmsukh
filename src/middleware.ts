import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession, ADMIN_PORTAL_ROLES } from "@/lib/session";

// Portal gatekeeping. Fine-grained permission checks happen again on every page and action.
// Subdomains (doctor.parmsukh.com / admin.parmsukh.com) are rewritten onto /doctor and /admin.
export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const host = req.headers.get("host") ?? "";
  if (host.startsWith("doctor.") && !/^\/doctor(\/|$)/.test(url.pathname) && !url.pathname.startsWith("/_next")) {
    url.pathname = url.pathname === "/" ? "/doctor" : `/doctor${url.pathname}`;
    return NextResponse.rewrite(url);
  }
  if (host.startsWith("admin.") && !url.pathname.startsWith("/admin") && !url.pathname.startsWith("/_next")) {
    url.pathname = url.pathname === "/" ? "/admin" : `/admin${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  const s = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const p = url.pathname;
  const deny = (to: string) => { url.pathname = to; url.search = `?next=${encodeURIComponent(p)}`; return NextResponse.redirect(url); };

  const under = (root: string) => p === root || p.startsWith(root + "/");
  if (under("/doctor") && s?.role !== "DOCTOR") return deny("/staff-login");
  if (under("/admin") && !(s && ADMIN_PORTAL_ROLES.includes(s.role))) return deny("/staff-login");
  if (under("/dashboard") && s?.role !== "PATIENT") return deny("/login");
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"] };
