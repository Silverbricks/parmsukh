// Dedicated case-record fields (SRS v3 §3.4 Homoeopathy, §3.5 Ayurveda).
export const HOMEO_FIELDS = [
  ["mainComplaint", "Main complaint"], ["physicalSymptoms", "Physical symptoms"], ["mentalEmotional", "Mental & emotional history"],
  ["modalities", "Symptom modalities"], ["location", "Location of symptoms"], ["sensations", "Sensations"],
  ["aggravations", "Aggravating factors"], ["ameliorations", "Ameliorating factors"], ["pastHistory", "Past medical history"],
  ["familyHistory", "Family history"], ["sleep", "Sleep"], ["appetite", "Appetite"], ["thirst", "Thirst"],
  ["thermals", "Thermal preferences"], ["patientObservations", "Patient-reported observations"],
  ["practitionerAssessment", "Practitioner assessment"], ["remedyConsideration", "Remedy consideration"],
  ["remedyName", "Remedy name"], ["potency", "Potency"], ["dosage", "Dosage"], ["frequency", "Frequency"],
  ["duration", "Duration"], ["precautions", "Precautions"], ["followUpObservations", "Follow-up observations"],
] as const;

export const AYUR_FIELDS = [
  ["prakriti", "Prakriti assessment"], ["vikriti", "Vikriti assessment"], ["doshaObservations", "Dosha observations"],
  ["agni", "Agni assessment"], ["digestiveHistory", "Digestive history"], ["sleepPatterns", "Sleep patterns"],
  ["dietaryHabits", "Dietary habits"], ["lifestyle", "Lifestyle"], ["bowelHabits", "Bowel habits"], ["energyLevels", "Energy levels"],
  ["practitionerObservations", "Practitioner observations"], ["dietaryRecommendations", "Dietary recommendations"],
  ["lifestyleRecommendations", "Lifestyle recommendations"], ["herbalRecommendations", "Herbal product recommendations"],
  ["precautionsInteractions", "Precautions & interactions"], ["pregnancyPrecautions", "Pregnancy & breastfeeding precautions"],
  ["followUpAssessment", "Follow-up assessment"],
] as const;

export const SHORT_FIELDS = new Set(["potency", "remedyName", "dosage", "frequency", "duration", "prakriti", "vikriti", "agni", "thermals", "thirst", "appetite", "energyLevels"]);
