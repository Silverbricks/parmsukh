import { SystemPage } from "@/components/system-page";

export const dynamic = "force-dynamic";
export const metadata = { title: "Homoeopathy" };

export default function Homoeopathy() {
  return (
    <SystemPage
      system="HOMOEOPATHY"
      title="Homoeopathy"
      intro="A homoeopathic consultation takes a detailed case history – your main complaint, physical symptoms, modalities (what makes things better or worse), sleep, appetite, thirst, thermal preferences and emotional history. Remedy selection is made and recorded by your practitioner."
      points={[
        "Detailed individual case taking",
        "Practitioner-recorded remedy, potency and follow-up review",
        "Progress tracked over time through follow-up consultations",
      ]}
    />
  );
}
