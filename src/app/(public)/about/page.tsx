import Link from "next/link";
import { CLINIC } from "@/lib/constants";

export const metadata = { title: "About PARMSUKH" };

export default function About() {
  return (
    <div className="container-p max-w-3xl py-12">
      <h1 className="text-4xl font-semibold">About PARMSUKH</h1>
      <p className="mt-4 text-charcoal-700">
        {CLINIC.name} brings together traditional Ayurveda and Homoeopathy in a calm, professional setting on {CLINIC.address}.
        Consultations are led by {CLINIC.practitioner} and focus on understanding the whole person – physical symptoms, digestion, sleep, lifestyle and emotional wellbeing.
      </p>
      <h2 className="mt-8 text-2xl font-semibold">Our approach</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-charcoal-700">
        <li>Detailed case history before and during every consultation.</li>
        <li>Separate, practitioner-approved Ayurveda and Homoeopathy records.</li>
        <li>Clear safety screening – we refer promptly to conventional medical care when needed.</li>
        <li>Your health information is confidential and protected.</li>
      </ul>
      <p className="mt-8 rounded-lg bg-ivory-100 p-4 text-sm text-charcoal-700">
        PARMSUKH does not independently diagnose or guarantee treatment outcomes. Please continue any treatment prescribed by your doctor and seek conventional medical assessment where appropriate.
      </p>
      <Link href="/book-consultation" className="btn-primary mt-8">Book a consultation</Link>
    </div>
  );
}
