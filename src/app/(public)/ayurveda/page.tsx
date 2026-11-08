import { SystemPage } from "@/components/system-page";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ayurveda" };

export default function Ayurveda() {
  return (
    <SystemPage
      system="AYURVEDA"
      title="Ayurveda"
      intro="Ayurveda consultations at PARMSUKH look at your constitution (Prakriti), current imbalance (Vikriti), digestion (Agni), sleep, diet and daily routine. Your practitioner records an individual plan of dietary, lifestyle and – where appropriate – herbal recommendations."
      points={[
        "Prakriti & Vikriti assessment and dosha observations",
        "Digestive, sleep, bowel and energy history",
        "Dietary and lifestyle guidance with precautions and interaction checks",
      ]}
    />
  );
}
