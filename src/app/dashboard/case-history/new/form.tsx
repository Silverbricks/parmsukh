"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { submitComplaint } from "@/app/actions/patient";
import { COMPLAINT_CATEGORIES } from "@/lib/constants";
import { FormMessage, Submit } from "@/components/submit";
import { SafetyAlerts } from "@/components/ui";

export function ComplaintForm({ sex }: { sex: string | null }) {
  const [catKey, setCatKey] = useState("");
  const [state, action] = useActionState(submitComplaint, null);
  const cat = COMPLAINT_CATEGORIES.find((c) => c.key === catKey);
  const visible = COMPLAINT_CATEGORIES.filter((c) => !(sex === "Male" && c.key === "FEMALE_REPRODUCTIVE") && !(sex === "Female" && c.key === "MALE_SEXUAL"));

  if (state && "ok" in state) {
    return (
      <div className="space-y-4">
        <SafetyAlerts rules={state.safety ?? []} />
        <div className="card">
          <h2 className="section-title">Thank you – your concern has been added to your case history</h2>
          <p className="mt-2 text-sm text-charcoal-700">Your practitioner will review it before your consultation.</p>
          <div className="mt-4 flex gap-2">
            <Link href="/dashboard/case-history" className="btn-outline">Back to case history</Link>
            <Link href="/dashboard/documents" className="btn-outline">Upload reports</Link>
            <Link href="/book-consultation" className="btn-primary">Book consultation</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {visible.map((c) => (
          <button type="button" key={c.key} onClick={() => setCatKey(c.key)}
            className={`rounded-lg border p-4 text-left ${catKey === c.key ? "border-forest-700 bg-forest-50 ring-2 ring-forest-200" : "border-stone-300 bg-white hover:border-forest-500"}`}>
            <div className="font-medium">{c.title}</div>
            <div className="text-xs text-charcoal-500">{c.description}</div>
          </button>
        ))}
      </div>
      {cat && (
        <div className="card space-y-4">
          <input type="hidden" name="category" value={cat.key} />
          {cat.sensitive && (
            <div className="rounded-lg bg-gold-100 p-3 text-sm text-gold-700">
              {cat.description}
              <label className="mt-2 flex items-start gap-2 text-charcoal-900"><input type="checkbox" name="sensitiveConsent" className="mt-1" /> I consent to sharing this sensitive information with my treating practitioner.</label>
            </div>
          )}
          {cat.key === "MENTAL" && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              If you are thinking about ending your life or are in immediate danger, call <b>112</b> now or Tele-MANAS <b>14416</b> (24×7, free).
            </div>
          )}
          <label className="block"><span className="label">Main concern *</span>
            <select className="input" name="title" required defaultValue="">
              <option value="" disabled>Select…</option>
              {cat.topics.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label className="block"><span className="label">Describe your symptoms *</span><textarea className="textarea" name="symptoms" required rows={4} /></label>
          <div className="grid gap-4 sm:grid-cols-4">
            <label className="block"><span className="label">Started on</span><input className="input" type="date" name="startDate" /></label>
            <label className="block"><span className="label">Duration</span><input className="input" name="duration" placeholder="e.g. 3 months" /></label>
            <label className="block"><span className="label">Frequency</span><input className="input" name="frequency" placeholder="daily / weekly" /></label>
            <label className="block"><span className="label">Severity (1–10)</span><input className="input" type="number" min={1} max={10} name="severity" /></label>
          </div>
          <label className="block"><span className="label">Previous treatment</span><textarea className="textarea" name="previousTreatment" rows={2} /></label>
          <label className="block"><span className="label">Previous investigations</span><textarea className="textarea" name="investigations" rows={2} placeholder={cat.uploadHint ? `You can upload: ${cat.uploadHint}` : ""} /></label>

          <div className="space-y-3 border-t border-ivory-200 pt-4">
            <div className="text-sm font-semibold">{cat.title} – specific questions</div>
            {cat.questions.map((q) => (
              <div key={q.id}>
                <span className="label">{q.label}</span>
                {q.type === "yesno" ? (
                  <div className="flex gap-4 text-sm">
                    <label className="flex items-center gap-1"><input type="radio" name={`q_${q.id}`} value="yes" /> Yes</label>
                    <label className="flex items-center gap-1"><input type="radio" name={`q_${q.id}`} value="no" /> No</label>
                  </div>
                ) : q.type === "select" ? (
                  <select className="input" name={`q_${q.id}`} defaultValue=""><option value="">—</option>{q.options!.map((o) => <option key={o}>{o}</option>)}</select>
                ) : q.type === "scale" ? (
                  <input className="input w-32" type="number" min={1} max={10} name={`q_${q.id}`} />
                ) : <input className="input" name={`q_${q.id}`} />}
              </div>
            ))}
          </div>
          <FormMessage state={state && "error" in state ? { error: state.error } : null} />
          <Submit pendingText="Submitting…">Submit to my case history</Submit>
        </div>
      )}
    </form>
  );
}
