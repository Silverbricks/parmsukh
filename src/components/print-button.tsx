"use client";
export function PrintButton({ label = "Download / print PDF" }: { label?: string }) {
  return <button type="button" className="btn-outline no-print" onClick={() => window.print()}>{label}</button>;
}
