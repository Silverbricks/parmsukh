import { db } from "@/lib/db";
import { requirePatient } from "@/lib/auth";
import { ActionForm } from "@/components/action-form";
import { Empty, Field, PageHeader, Select } from "@/components/ui";
import { uploadDocument } from "@/app/actions/patient";
import { DOCUMENT_KINDS } from "@/lib/constants";
import { fmtDateTime, label } from "@/lib/format";

export default async function MyDocuments() {
  const { patient } = await requirePatient();
  const docs = await db.patientDocument.findMany({ where: { patientId: patient.id }, orderBy: { createdAt: "desc" } });
  return (
    <div className="space-y-6">
      <PageHeader title="My Reports" sub="Upload blood tests, scans, previous prescriptions and photographs. Files are stored securely and shared only with your practitioner." />
      <div className="card">
        <ActionForm action={uploadDocument} submit="Upload" pendingText="Uploading…" resetOnSuccess className="grid gap-4 md:grid-cols-4 md:items-end">
          <Select label="Document type" name="kind" options={[...DOCUMENT_KINDS]} required />
          <Field label="Title" name="title" placeholder="e.g. Ultrasound KUB, March" />
          <label className="block md:col-span-2"><span className="label">File (PDF, JPG, PNG, WEBP – max 10 MB)</span><input className="input" type="file" name="file" required accept=".pdf,.jpg,.jpeg,.png,.webp" /></label>
          <label className="flex items-start gap-2 text-xs md:col-span-4"><input type="checkbox" name="photoConsent" className="mt-0.5" /> For photographs: I consent to uploading clinical photographs for my care.</label>
        </ActionForm>
      </div>
      <div className="card">
        {docs.length ? (
          <table className="table">
            <thead><tr><th>Title</th><th>Type</th><th>Uploaded</th><th>By</th><th /></tr></thead>
            <tbody>{docs.map((d) => (
              <tr key={d.id}><td>{d.title}</td><td>{label(d.kind)}</td><td>{fmtDateTime(d.createdAt)}</td><td>{d.uploaderRole === "PATIENT" ? "You" : "Clinic"}</td>
                <td><a href={`/api/documents/${d.id}`} target="_blank" className="text-forest-700 underline">Open</a></td></tr>
            ))}</tbody>
          </table>
        ) : <Empty>No documents uploaded yet.</Empty>}
      </div>
    </div>
  );
}
