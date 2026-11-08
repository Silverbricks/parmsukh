export const CLINIC = {
  brand: "PARMSUKH",
  name: "PARMSUKH Ayurveda & Homoeopathy Centre",
  tagline: "Traditional Wisdom. Holistic Wellbeing.",
  practitioner: "Dr Darshan Bhogal",
  // SRS §2.1: PIN must be verified before it is printed on official documents (Bathinda PINs are 151xxx).
  address: "Bhatti Road, Bathinda, Punjab, India",
  phone: "+91-XXXXXXXXXX",
  email: "care@parmsukh.com",
  emergency: "112",
};

export const SYSTEMS = { HOMOEOPATHY: "Homoeopathy", AYURVEDA: "Ayurveda", GENERAL: "General Wellness" } as const;
export type SystemKey = keyof typeof SYSTEMS;

export const SERVICES = {
  INITIAL: "Initial consultation",
  FOLLOW_UP: "Follow-up",
  REPORT_REVIEW: "Medical report review",
  WELLNESS: "Wellness consultation",
} as const;

export const MODES = { IN_PERSON: "In-person", ONLINE: "Online (video)", PHONE: "Telephone" } as const;

export const APPOINTMENT_STATUSES = ["REQUESTED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;
export const ORDER_STATUSES = ["PENDING", "CONFIRMED", "PROCESSING", "DISPATCHED", "DELIVERED", "CANCELLED", "RETURN_REQUESTED", "RETURNED"] as const;
export const PROGRESS_STATUSES = ["IMPROVED", "NO_CHANGE", "WORSENED", "RESOLVED", "REFERRED", "FOLLOW_UP_REQUIRED"] as const;
export const DOCUMENT_KINDS = ["BLOOD_TEST", "URINE_TEST", "ULTRASOUND", "CT_SCAN", "XRAY", "PRESCRIPTION", "SPECIALIST", "ENT_REPORT", "PHOTO", "OTHER"] as const;

export const CONSENT_TYPES = {
  PRIVACY_POLICY: "I have read and accept the Privacy Policy",
  HEALTH_DATA: "I consent to PARMSUKH collecting and processing my health information for my care",
  SENSITIVE_DATA: "I consent to sharing sensitive information (e.g. sexual or mental health) with my practitioner",
  PHOTOGRAPHS: "I consent to uploading clinical photographs",
  TELECONSULTATION: "I consent to online / telephone consultations",
  INFO_SHARING: "I consent to sharing my records with other healthcare providers when referred",
  MARKETING: "I would like to receive health tips and offers (optional)",
} as const;

// ───────── Health complaint questionnaires (SRS 2.0 §6) ─────────

export type Question = {
  id: string;
  label: string;
  type: "text" | "yesno" | "scale" | "select";
  options?: string[];
  /** Safety rule triggered when answered "yes" (or matching value). */
  redFlag?: string;
  showIf?: { sex?: "Male" | "Female" };
};

export type ComplaintCategory = {
  key: string; title: string; sensitive: boolean; description: string;
  topics: string[]; questions: Question[]; uploadHint?: string;
};

const common: Question[] = [
  { id: "prev_assessment", label: "Have you had a medical assessment for this?", type: "yesno" },
  { id: "current_meds", label: "Medicines you are currently taking for this (if any)", type: "text" },
];

export const COMPLAINT_CATEGORIES: ComplaintCategory[] = [
  {
    key: "GENERAL", title: "General health", sensitive: false, description: "Any other health concern.",
    topics: ["Fatigue", "Joint pain", "Headache", "Weight concerns", "Immunity", "Other"],
    questions: [...common],
  },
  {
    key: "MALE_SEXUAL", title: "Male sexual health", sensitive: true,
    description: "Confidential. Visible only to your treating practitioner.",
    topics: ["Erectile concerns", "Premature ejaculation", "Reduced libido", "Performance anxiety", "Fertility concerns", "Genital symptoms", "Urinary symptoms"],
    questions: [
      { id: "morning_erections", label: "Do you have morning erections?", type: "select", options: ["Yes, regularly", "Sometimes", "Rarely / never", "Prefer not to say"] },
      { id: "diabetes_bp", label: "Do you have diabetes, high blood pressure or heart disease?", type: "yesno" },
      { id: "genital_lump", label: "Have you noticed a new lump, sore or swelling on the genitals?", type: "yesno", redFlag: "GENITAL_LUMP" },
      { id: "painful_erection", label: "Have you had an erection lasting more than 4 hours?", type: "yesno", redFlag: "PRIAPISM" },
      { id: "anxiety", label: "How much does this affect your stress or mood? (1–10)", type: "scale" },
      ...common,
    ],
  },
  {
    key: "FEMALE_REPRODUCTIVE", title: "Female sexual & reproductive health", sensitive: true,
    description: "Confidential. Visible only to your treating practitioner.",
    topics: ["Menstrual irregularities", "Menstrual pain", "Perimenopause / menopause", "PCOS-related concerns", "Fertility concerns", "Reduced libido", "Vaginal dryness", "Pain during intercourse", "Other reproductive concern"],
    questions: [
      { id: "lmp", label: "First day of last menstrual period (if applicable)", type: "text" },
      { id: "cycle", label: "Typical cycle length and pattern", type: "text" },
      { id: "pregnant", label: "Is there any possibility you are pregnant?", type: "select", options: ["No", "Yes", "Not sure"] },
      { id: "breastfeeding", label: "Are you currently breastfeeding?", type: "yesno" },
      { id: "heavy_bleeding", label: "Very heavy bleeding (soaking a pad every hour) or bleeding after menopause?", type: "yesno", redFlag: "ABNORMAL_BLEEDING" },
      { id: "pelvic_pain_severe", label: "Sudden severe pelvic pain or fainting?", type: "yesno", redFlag: "SEVERE_PELVIC_PAIN" },
      ...common,
    ],
  },
  {
    key: "GASTRIC", title: "Gastric & digestive health", sensitive: false, description: "Acidity, bloating, bowel and appetite concerns.",
    topics: ["Acidity", "Heartburn", "Bloating", "Gas", "Constipation", "Diarrhoea", "Indigestion", "IBS symptoms", "Abdominal pain", "Nausea", "Appetite problems"],
    questions: [
      { id: "food_trigger", label: "Foods that trigger or worsen symptoms", type: "text" },
      { id: "bowel", label: "Bowel pattern (frequency, consistency)", type: "text" },
      { id: "pain_location", label: "Where is the pain located (if any)?", type: "text" },
      { id: "blood_stool", label: "Blood in stool, black stools, or vomiting blood?", type: "yesno", redFlag: "GI_BLEEDING" },
      { id: "weight_loss", label: "Unintentional weight loss in the last 3 months?", type: "yesno", redFlag: "WEIGHT_LOSS" },
      { id: "severe_abdo", label: "Severe or worsening abdominal pain right now?", type: "yesno", redFlag: "SEVERE_ABDOMINAL_PAIN" },
      { id: "swallowing", label: "Difficulty swallowing?", type: "yesno", redFlag: "DYSPHAGIA" },
      ...common,
    ],
  },
  {
    key: "KIDNEY", title: "Kidney & urinary health", sensitive: false,
    description: "Kidney stones and urinary concerns. You can upload ultrasound, CT, urine and kidney-function reports.",
    uploadHint: "Ultrasound, CT scan, urine and kidney-function test reports",
    topics: ["Kidney stone history", "Suspected kidney stone", "Urinary discomfort", "Frequent urination", "Blood in urine", "Flank pain", "Recurrent urinary problems"],
    questions: [
      { id: "stone_size", label: "Stone size / location if known from a report", type: "text" },
      { id: "fever", label: "Do you currently have fever or chills?", type: "yesno", redFlag: "KIDNEY_STONE_FEVER" },
      { id: "cannot_pass", label: "Are you unable to pass urine?", type: "yesno", redFlag: "URINARY_RETENTION" },
      { id: "severe_pain", label: "Severe pain not controlled by painkillers?", type: "yesno", redFlag: "SEVERE_FLANK_PAIN" },
      { id: "blood_urine", label: "Blood in urine?", type: "yesno", redFlag: "HAEMATURIA" },
      ...common,
    ],
  },
  {
    key: "SKIN", title: "Skin, hair & scalp", sensitive: false, description: "You may upload photographs of the affected area (with consent).",
    uploadHint: "Photographs of the affected area",
    topics: ["Eczema", "Psoriasis", "Acne", "Itching", "Rashes", "Pigmentation", "Dry skin", "Hair & scalp", "Fungal infection", "Allergic skin reaction"],
    questions: [
      { id: "area", label: "Affected area(s)", type: "text" },
      { id: "spreading", label: "Rapidly spreading rash with fever, or blistering / peeling skin?", type: "yesno", redFlag: "SEVERE_SKIN_REACTION" },
      { id: "swelling", label: "Swelling of the face, lips or tongue, or difficulty breathing?", type: "yesno", redFlag: "ANAPHYLAXIS" },
      ...common,
    ],
  },
  {
    key: "ENT", title: "ENT & nasal health", sensitive: false, description: "You can upload ENT reports, CT scans and endoscopy reports.",
    uploadHint: "ENT, CT scan and nasal endoscopy reports",
    topics: ["Nasal polyps", "Nasal congestion", "Sinus problems", "Difficulty breathing through the nose", "Reduced sense of smell", "Recurrent sinusitis", "Allergies", "Nasal discharge"],
    questions: [
      { id: "side", label: "One side or both sides?", type: "select", options: ["Left", "Right", "Both", "Not sure"] },
      { id: "bleeding_one_side", label: "Recurrent nosebleeds or bloody discharge from one side?", type: "yesno", redFlag: "UNILATERAL_NASAL_BLEEDING" },
      { id: "eye_swelling", label: "Swelling around the eye, vision change or severe headache?", type: "yesno", redFlag: "ORBITAL_SYMPTOMS" },
      { id: "breathing", label: "Severe breathing difficulty right now?", type: "yesno", redFlag: "BREATHING_DIFFICULTY" },
      ...common,
    ],
  },
  {
    key: "MENTAL", title: "Mental & emotional wellbeing", sensitive: true,
    description: "Confidential. This does not replace psychiatric or psychological assessment. Do not stop prescribed medication without advice from your prescriber.",
    topics: ["Stress", "Anxiety symptoms", "Low mood", "Sleep disturbance", "Emotional distress", "Grief", "Concentration difficulties", "Panic symptoms", "Mood changes"],
    questions: [
      { id: "sleep_hours", label: "Average hours of sleep per night", type: "text" },
      { id: "on_psych_meds", label: "Are you taking medicine prescribed by a psychiatrist or doctor for this?", type: "yesno" },
      { id: "self_harm_thoughts", label: "In the past two weeks, have you had thoughts of harming yourself or that you would be better off dead?", type: "yesno", redFlag: "SELF_HARM_THOUGHTS" },
      { id: "intent", label: "Do you have any plan or intention to act on these thoughts?", type: "yesno", redFlag: "SUICIDAL_INTENT" },
      { id: "unsafe", label: "Do you feel unable to keep yourself safe right now?", type: "yesno", redFlag: "UNABLE_TO_KEEP_SAFE" },
      { id: "voices", label: "Hearing or seeing things others don't, or feeling others are controlling your thoughts?", type: "yesno", redFlag: "PSYCHOSIS" },
      ...common,
    ],
  },
];

export const categoryByKey = (k: string) => COMPLAINT_CATEGORIES.find((c) => c.key === k) ?? COMPLAINT_CATEGORIES[0];
