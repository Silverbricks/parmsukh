"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "./panel";

export function NavLinks({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
      {items.map((i) => {
        const active = i.exact ? path === i.href : path === i.href || path.startsWith(i.href + "/");
        return <Link key={i.href} href={i.href} className={`nav-link whitespace-nowrap ${active ? "nav-link-active" : ""}`}>{i.label}</Link>;
      })}
    </nav>
  );
}
