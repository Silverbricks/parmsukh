import Link from "next/link";
import { label } from "@/lib/format";
import { ruleById, type SafetyRule } from "@/lib/safety";

export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-semibold">{title}</h1>
        {sub && <p className="mt-1 text-sm text-charcoal-500">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label: l, value, href, tone = "forest" }: { label: string; value: React.ReactNode; href?: string; tone?: "forest" | "gold" | "red" }) {
  const toneCls = tone === "gold" ? "text-gold-700" : tone === "red" ? "text-red-700" : "text-forest-700";
  const body = (
    <div className="card h-full transition hover:shadow-md">
      <div className="text-xs font-medium uppercase tracking-wide text-charcoal-500">{l}</div>
      <div className={`mt-2 font-serif text-3xl font-semibold ${toneCls}`}>{value}</div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

const BADGE: Record<string, string> = {
  CONFIRMED: "bg-forest-100 text-forest-800", COMPLETED: "bg-forest-700 text-white", REQUESTED: "bg-gold-100 text-gold-700",
  CANCELLED: "bg-stone-200 text-stone-700", NO_SHOW: "bg-red-100 text-red-800", PENDING: "bg-gold-100 text-gold-700",
  PROCESSING: "bg-blue-100 text-blue-800", DISPATCHED: "bg-indigo-100 text-indigo-800", DELIVERED: "bg-forest-700 text-white",
  PAID: "bg-forest-100 text-forest-800", REFUNDED: "bg-stone-200 text-stone-700", REFUND_REQUESTED: "bg-red-100 text-red-800",
  RETURN_REQUESTED: "bg-red-100 text-red-800", RETURNED: "bg-stone-200 text-stone-700",
  IN_PROGRESS: "bg-gold-100 text-gold-700", DUE: "bg-gold-100 text-gold-700", DONE: "bg-forest-100 text-forest-800",
  EMERGENCY: "bg-red-700 text-white", URGENT: "bg-red-100 text-red-800", PROMPT: "bg-amber-100 text-amber-800",
};
export function Badge({ s, text }: { s: string; text?: string }) {
  return <span className={`badge ${BADGE[s] ?? "bg-ivory-200 text-charcoal-700"}`}>{text ?? label(s)}</span>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-stone-300 bg-white/60 p-8 text-center text-sm text-charcoal-500">{children}</div>;
}

export function Field({ label: l, name, type = "text", defaultValue, required, placeholder, hint, className = "", ...rest }:
  { label: string; name: string; type?: string; defaultValue?: string | number | null; required?: boolean; placeholder?: string; hint?: string; className?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "defaultValue">) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{l}{required && <span className="text-red-600"> *</span>}</span>
      <input className="input" name={name} type={type} defaultValue={defaultValue ?? undefined} required={required} placeholder={placeholder} {...rest} />
      {hint && <span className="mt-1 block text-xs text-charcoal-500">{hint}</span>}
    </label>
  );
}

export function Area({ label: l, name, defaultValue, rows = 3, placeholder, className = "" }: { label: string; name: string; defaultValue?: string | null; rows?: number; placeholder?: string; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{l}</span>
      <textarea className="textarea" name={name} rows={rows} defaultValue={defaultValue ?? ""} placeholder={placeholder} />
    </label>
  );
}

export function Select({ label: l, name, options, defaultValue, required, className = "" }: { label: string; name: string; options: [string, string][] | string[]; defaultValue?: string | null; required?: boolean; className?: string }) {
  const opts = (options as (string | [string, string])[]).map((o) => (Array.isArray(o) ? o : [o, label(o)]));
  return (
    <label className={`block ${className}`}>
      <span className="label">{l}{required && <span className="text-red-600"> *</span>}</span>
      <select className="input" name={name} defaultValue={defaultValue ?? ""} required={required}>
        {!required && <option value="">—</option>}
        {opts.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </label>
  );
}

export function SafetyAlerts({ rules, audience = "patient" }: { rules: (SafetyRule | string)[]; audience?: "patient" | "doctor" }) {
  const list = rules.map((r) => (typeof r === "string" ? ruleById(r) : r)).filter(Boolean) as SafetyRule[];
  if (!list.length) return null;
  const emergency = list.some((r) => r.urgency === "EMERGENCY");
  return (
    <div role="alert" className={`rounded-xl border-2 p-4 ${emergency ? "border-red-700 bg-red-50" : "border-amber-500 bg-amber-50"}`}>
      <div className="font-semibold text-red-800">
        {audience === "patient"
          ? emergency ? "Please seek emergency help now – call 112" : "Your answers suggest you should see a medical doctor promptly"
          : "Safety screening – referral required"}
      </div>
      <ul className="mt-2 space-y-1 text-sm">
        {list.map((r) => (
          <li key={r.id} className="flex gap-2"><Badge s={r.urgency} /> <span><b>{r.title}:</b> {r.action}</span></li>
        ))}
      </ul>
      {audience === "patient" && <p className="mt-2 text-xs text-charcoal-700">Complementary therapies must not delay necessary medical treatment. India emergency number: 112. Tele-MANAS mental health helpline: 14416.</p>}
    </div>
  );
}

export function Notice({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "warn" | "ok" | "error" }) {
  const c = { info: "border-forest-200 bg-forest-50 text-forest-800", warn: "border-amber-300 bg-amber-50 text-amber-900", ok: "border-forest-300 bg-forest-50 text-forest-800", error: "border-red-300 bg-red-50 text-red-800" }[tone];
  return <div className={`rounded-lg border px-4 py-3 text-sm ${c}`}>{children}</div>;
}
