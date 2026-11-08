import { PageHeader } from "@/components/ui";
import { requirePatient } from "@/lib/auth";
import { ComplaintForm } from "./form";

export default async function NewComplaint() {
  const { patient } = await requirePatient();
  return (
    <div className="max-w-3xl">
      <PageHeader title="Add a health concern" sub="Choose the area that best matches your concern. Sensitive categories are visible only to your treating practitioner." />
      <ComplaintForm sex={patient.sex} />
    </div>
  );
}
