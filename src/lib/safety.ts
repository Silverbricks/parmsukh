// Mandatory medical safety & referral engine (SRS 2.0 §16).
// Rules are triggered by questionnaire red-flag answers and by keywords in free text.
// It never diagnoses – it only escalates to conventional medical care.

export type Urgency = "EMERGENCY" | "URGENT" | "PROMPT";

export type SafetyRule = { id: string; title: string; urgency: Urgency; action: string; keywords?: RegExp };

export const SAFETY_RULES: SafetyRule[] = [
  { id: "CHEST_PAIN", title: "Chest pain", urgency: "EMERGENCY", action: "Call emergency services (112) immediately.", keywords: /chest (pain|tightness)|heart attack/i },
  { id: "BREATHING_DIFFICULTY", title: "Severe breathing difficulty", urgency: "EMERGENCY", action: "Call emergency services (112) immediately.", keywords: /(can'?t|cannot|difficulty|struggling to) breath|breathless(ness)? at rest|choking/i },
  { id: "SUICIDAL_INTENT", title: "Suicidal intent", urgency: "EMERGENCY", action: "Immediate safety intervention. Call 112 or go to the nearest emergency department. Tele-MANAS: 14416.", keywords: /(kill|end) (myself|my life)|suicid|want to die/i },
  { id: "UNABLE_TO_KEEP_SAFE", title: "Unable to maintain personal safety", urgency: "EMERGENCY", action: "Immediate safety intervention. Call 112. Do not leave the person alone." },
  { id: "SELF_HARM_THOUGHTS", title: "Thoughts of self-harm", urgency: "URGENT", action: "Same-day mental health professional assessment. Tele-MANAS: 14416. If in immediate danger call 112.", keywords: /self[- ]?harm|cutting myself|hurt myself/i },
  { id: "PSYCHOSIS", title: "Possible psychotic symptoms", urgency: "URGENT", action: "Urgent psychiatric assessment.", keywords: /hearing voices|hallucinat/i },
  { id: "ANAPHYLAXIS", title: "Severe allergic reaction", urgency: "EMERGENCY", action: "Call emergency services (112) immediately.", keywords: /anaphyla|(face|lips?|tongue|throat) (is |are )?swell/i },
  { id: "NEURO_WEAKNESS", title: "New neurological weakness", urgency: "EMERGENCY", action: "Emergency assessment – call 112.", keywords: /(sudden|new) (weakness|numbness)|face droop|slurred speech|stroke/i },
  { id: "KIDNEY_STONE_FEVER", title: "Kidney stone with fever", urgency: "URGENT", action: "Urgent hospital assessment today." },
  { id: "URINARY_RETENTION", title: "Unable to pass urine", urgency: "URGENT", action: "Urgent hospital assessment today.", keywords: /(can'?t|cannot|unable to) (pass|urinate)/i },
  { id: "SEVERE_FLANK_PAIN", title: "Severe uncontrolled pain", urgency: "URGENT", action: "Urgent medical assessment." },
  { id: "SEVERE_ABDOMINAL_PAIN", title: "Severe abdominal pain", urgency: "URGENT", action: "Urgent medical assessment.", keywords: /severe (abdominal|stomach|belly) pain/i },
  { id: "HAEMATURIA", title: "Blood in urine", urgency: "PROMPT", action: "Prompt medical assessment with a doctor.", keywords: /blood in (my )?urine/i },
  { id: "GI_BLEEDING", title: "Gastrointestinal bleeding", urgency: "URGENT", action: "Urgent medical assessment.", keywords: /blood in (my )?(stool|poo)|black stool|vomit(ing)? blood/i },
  { id: "WEIGHT_LOSS", title: "Unexplained weight loss", urgency: "PROMPT", action: "Prompt medical assessment and investigations." },
  { id: "DYSPHAGIA", title: "Difficulty swallowing", urgency: "PROMPT", action: "Prompt medical assessment." },
  { id: "ABNORMAL_BLEEDING", title: "Heavy or post-menopausal bleeding", urgency: "PROMPT", action: "Prompt gynaecological assessment." },
  { id: "SEVERE_PELVIC_PAIN", title: "Sudden severe pelvic pain", urgency: "EMERGENCY", action: "Emergency assessment – call 112 (possible ectopic pregnancy if pregnancy possible)." },
  { id: "PRIAPISM", title: "Prolonged erection", urgency: "EMERGENCY", action: "Emergency department immediately." },
  { id: "GENITAL_LUMP", title: "New genital lump or sore", urgency: "PROMPT", action: "Prompt medical assessment." },
  { id: "SEVERE_SKIN_REACTION", title: "Severe skin reaction", urgency: "URGENT", action: "Urgent medical assessment." },
  { id: "UNILATERAL_NASAL_BLEEDING", title: "One-sided nasal bleeding", urgency: "PROMPT", action: "Prompt ENT assessment." },
  { id: "ORBITAL_SYMPTOMS", title: "Eye swelling / vision change with sinus symptoms", urgency: "URGENT", action: "Urgent ENT / eye assessment." },
];

const byId = new Map(SAFETY_RULES.map((r) => [r.id, r]));
export const ruleById = (id: string) => byId.get(id);

export function evaluateSafety(input: { text?: string; flags?: string[] }) {
  const ids = new Set<string>(input.flags ?? []);
  const text = input.text ?? "";
  for (const r of SAFETY_RULES) if (r.keywords && r.keywords.test(text)) ids.add(r.id);
  const order: Urgency[] = ["EMERGENCY", "URGENT", "PROMPT"];
  return [...ids]
    .map((id) => byId.get(id))
    .filter((r): r is SafetyRule => !!r)
    .sort((a, b) => order.indexOf(a.urgency) - order.indexOf(b.urgency));
}
