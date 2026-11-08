import Link from "next/link";
import { CLINIC } from "@/lib/constants";

export function LotusMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="31" fill="#1d4a2f" />
      <g fill="none" stroke="#dcc07a" strokeWidth="2.2" strokeLinejoin="round">
        <path d="M32 14c5 6 7 12 7 18s-3 11-7 14c-4-3-7-8-7-14s2-12 7-18z" />
        <path d="M32 46c-6-1-13-5-16-13 5-1 10 0 14 3" />
        <path d="M32 46c6-1 13-5 16-13-5-1-10 0-14 3" />
        <path d="M18 48h28" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function Logo({ href = "/", sub = true, light = false }: { href?: string; sub?: boolean; light?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-3">
      <LotusMark />
      <span className="leading-tight">
        <span className={`block font-serif text-2xl font-bold tracking-[0.12em] ${light ? "text-ivory-50" : "text-forest-800"}`}>{CLINIC.brand}</span>
        {sub && <span className={`block text-[11px] uppercase tracking-[0.18em] ${light ? "text-gold-300" : "text-gold-600"}`}>Ayurveda &amp; Homoeopathy Centre</span>}
      </span>
    </Link>
  );
}

const PALETTE: Record<string, [string, string]> = {
  AYURVEDA: ["#e9f1e3", "#2f6b45"], HOMOEOPATHY: ["#eef0f8", "#3c4f8a"], HERBAL: ["#f3f0dc", "#7a6125"],
  WELLNESS: ["#f6edd6", "#9a7b2f"], OTHER: ["#f2ebd9", "#4a4a48"],
};

/** Placeholder product artwork (no external images). */
export function ProductArt({ name, system, className = "" }: { name: string; system: string; className?: string }) {
  const [bg, fg] = PALETTE[system] ?? PALETTE.OTHER;
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <div className={`flex aspect-square items-center justify-center rounded-lg ${className}`} style={{ background: bg }}>
      <svg viewBox="0 0 100 100" className="h-2/3 w-2/3">
        <path d="M50 12c14 14 20 28 20 40S62 78 50 88C38 78 30 64 30 52s6-26 20-40z" fill="none" stroke={fg} strokeWidth="2" opacity=".35" />
        <text x="50" y="58" textAnchor="middle" fontFamily="Georgia, serif" fontSize="22" fill={fg}>{initials}</text>
      </svg>
    </div>
  );
}
