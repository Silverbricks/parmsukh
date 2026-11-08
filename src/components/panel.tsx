import { Logo } from "./brand";
import { NavLinks } from "./nav-links";
import { logout } from "@/app/actions/auth";

export type NavItem = { href: string; label: string; exact?: boolean };

export function PanelShell({ portal, nav, user, children }: { portal: string; nav: NavItem[]; user: { name: string; sub?: string }; children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[250px_1fr]">
      <aside className="no-print bg-forest-800 text-ivory-50 md:sticky md:top-0 md:h-screen md:overflow-y-auto">
        <div className="flex items-center justify-between p-4 md:block">
          <Logo href="/" light sub={false} />
          <div className="mt-0 text-[11px] uppercase tracking-[0.2em] text-gold-300 md:mt-2">{portal}</div>
        </div>
        <NavLinks items={nav} />
        <div className="border-t border-forest-700 p-4 text-sm">
          <div className="font-medium">{user.name}</div>
          {user.sub && <div className="text-xs text-ivory-100/70">{user.sub}</div>}
          <form action={logout} className="mt-3"><button className="text-xs text-gold-300 hover:underline">Sign out</button></form>
        </div>
      </aside>
      <main className="min-w-0 p-4 md:p-8">{children}</main>
    </div>
  );
}
