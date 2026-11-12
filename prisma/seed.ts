import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const PASSWORD = "Parmsukh@123";

const ymd = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

const STORE_CATEGORIES: [string, string][] = [
  ["ayurvedic-medicines", "Ayurvedic Medicines"], ["homoeopathic-medicines", "Homoeopathic Medicines"],
  ["herbal-products", "Herbal Products"], ["natural-wellness", "Natural Wellness"], ["personal-care", "Personal Care"],
  ["skin-hair-care", "Skin & Hair Care"], ["digestive-wellness", "Digestive Wellness"],
  ["health-accessories", "Health Accessories"], ["books", "Books & Education"],
];
const CLINIC_SETTINGS: Record<string, string> = {
  clinic_name: "PARMSUKH Ayurveda & Homoeopathy Centre",
  clinic_address: "Bhatti Road, Bathinda, Punjab, India",
  clinic_phone: "", clinic_email: "care@parmsukh.com",
  opening_hours: "Mon–Fri 10:00–13:00, 16:00–19:00 · Sat 10:00–13:00",
  holidays: "",
  invoice_prefix: "PS", gstin: "",
};

/** Production: one super admin from env vars + store categories + clinic settings. No demo accounts or data. */
async function seedProduction() {
  const email = process.env.SEED_SUPERADMIN_EMAIL?.trim().toLowerCase();
  const pw = process.env.SEED_SUPERADMIN_PASSWORD;
  if (!email || !pw || pw.length < 14) {
    throw new Error("SEED_MODE=production needs SEED_SUPERADMIN_EMAIL and SEED_SUPERADMIN_PASSWORD (14+ characters)");
  }
  await db.user.upsert({ where: { email }, update: {}, create: { role: "SUPER_ADMIN", name: "Super Admin", email, passwordHash: await bcrypt.hash(pw, 12) } });
  for (const [i, [slug, name]] of STORE_CATEGORIES.entries()) {
    await db.category.upsert({ where: { slug }, update: {}, create: { slug, name, sort: i } });
  }
  for (const [key, value] of Object.entries(CLINIC_SETTINGS)) {
    await db.clinicSetting.upsert({ where: { key }, update: {}, create: { key, value } });
  }
  console.log(`Production seed complete: super admin ${email}, ${STORE_CATEGORIES.length} store categories, clinic settings. No demo data.`);
}

async function main() {
  if (process.env.SEED_MODE === "production") return seedProduction();
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const staff = [
    { role: "SUPER_ADMIN", name: "Super Admin", email: "superadmin@parmsukh.com" },
    { role: "DOCTOR_ADMIN", name: "Clinic Admin", email: "admin@parmsukh.com" },
    { role: "RECEPTIONIST", name: "Front Desk", email: "reception@parmsukh.com" },
    { role: "STORE_MANAGER", name: "Store Manager", email: "store@parmsukh.com" },
    { role: "ORDER_MANAGER", name: "Order Manager", email: "orders@parmsukh.com" },
  ];
  for (const s of staff) {
    await db.user.upsert({ where: { email: s.email }, update: {}, create: { ...s, passwordHash } });
  }

  // Practitioner – Dr Darshan Bhogal. Registration details left blank until verified (SRS §20).
  const drUser = await db.user.upsert({
    where: { email: "dr.darshan@parmsukh.com" }, update: {},
    create: { role: "DOCTOR", name: "Dr Darshan Bhogal", email: "dr.darshan@parmsukh.com", passwordHash },
  });
  await db.counter.upsert({ where: { name: "doctor" }, update: {}, create: { name: "doctor", value: 1 } });
  const doctor = await db.doctor.upsert({
    where: { userId: drUser.id }, update: {},
    create: {
      userId: drUser.id, code: "DOC-001", slug: "dr-darshan-bhogal",
      qualifications: "To be verified", specialisations: "Homoeopathy,Ayurveda,Digestive wellness,Skin,Lifestyle",
      systems: "HOMOEOPATHY,AYURVEDA,GENERAL", experienceYears: 0, fee: 500, followUpFee: 300, slotMinutes: 20,
      bio: "Founder practitioner at PARMSUKH Ayurveda & Homoeopathy Centre, Bathinda. Offers individualised, practitioner-supervised Ayurveda and Homoeopathy consultations alongside conventional medical care.",
      verified: false,
    },
  });
  if ((await db.doctorAvailability.count({ where: { doctorId: doctor.id } })) === 0) {
    for (const wd of [1, 2, 3, 4, 5, 6]) {
      await db.doctorAvailability.create({ data: { doctorId: doctor.id, weekday: wd, startTime: "10:00", endTime: "13:00" } });
      if (wd !== 6) await db.doctorAvailability.create({ data: { doctorId: doctor.id, weekday: wd, startTime: "16:00", endTime: "19:00" } });
    }
  }

  // Demo patient with OTP login (mobile 9876543210)
  const pUser = await db.user.upsert({ where: { mobile: "9876543210" }, update: {}, create: { role: "PATIENT", name: "Aman Singh", mobile: "9876543210" } });
  await db.counter.upsert({ where: { name: "patient" }, update: {}, create: { name: "patient", value: 1 } });
  const patient = await db.patient.upsert({
    where: { mobile: "9876543210" }, update: {},
    create: { patientCode: "PAR-000001", userId: pUser.id, firstName: "Aman", lastName: "Singh", dob: "1990-04-12", sex: "Male", mobile: "9876543210", city: "Bathinda", state: "Punjab", createdById: drUser.id },
  });
  await db.medicalHistory.upsert({
    where: { patientId: patient.id }, update: {},
    create: { patientId: patient.id, heightCm: 175, weightKg: 78, allergies: "None known", medications: "None", sleep: "6 hours, disturbed", appetite: "Variable", digestion: "Acidity after spicy food", stressLevel: 6 },
  });
  if ((await db.healthComplaint.count({ where: { patientId: patient.id } })) === 0) {
    await db.healthComplaint.create({
      data: { patientId: patient.id, category: "GASTRIC", title: "Acidity", symptoms: "Burning sensation after meals, bloating in the evening", duration: "6 months", severity: 6, answers: JSON.stringify({ food_trigger: "Spicy and fried food", blood_stool: "no", weight_loss: "no" }) },
    });
  }
  for (const type of ["PRIVACY_POLICY", "HEALTH_DATA", "TELECONSULTATION"]) {
    if (!(await db.consent.findFirst({ where: { patientId: patient.id, type } })))
      await db.consent.create({ data: { patientId: patient.id, type, granted: true } });
  }

  // Store
  const cats = STORE_CATEGORIES;
  const catId: Record<string, string> = {};
  for (const [i, [slug, name]] of cats.entries()) {
    const c = await db.category.upsert({ where: { slug }, update: {}, create: { slug, name, sort: i } });
    catId[slug] = c.id;
  }

  const products = [
    { sku: "PS-AY-001", slug: "triphala-churna-100g", name: "Triphala Churna", brand: "PARMSUKH", ownBrand: true, manufacturer: "PARMSUKH Herbals", cat: "ayurvedic-medicines", system: "AYURVEDA", packSize: "100 g", mrp: 220, price: 189, ingredients: "Amalaki, Bibhitaki, Haritaki", description: "Classical Ayurvedic formulation traditionally used to support digestion and regular bowel movement.", usage: "As directed by your practitioner. Typically 3–5 g with warm water at bedtime.", warnings: "Not recommended during pregnancy without practitioner advice. Discontinue if diarrhoea occurs." },
    { sku: "PS-AY-002", slug: "ashwagandha-capsules-60", name: "Ashwagandha Capsules", brand: "PARMSUKH", ownBrand: true, manufacturer: "PARMSUKH Herbals", cat: "ayurvedic-medicines", system: "AYURVEDA", packSize: "60 capsules", mrp: 450, price: 399, ingredients: "Withania somnifera root extract 500 mg", description: "Traditionally used in Ayurveda as a rasayana to support vitality and stress resilience.", usage: "1 capsule twice daily after meals, or as directed.", warnings: "Avoid in pregnancy. Consult your doctor if you have thyroid disease or take sedatives or immunosuppressants." },
    { sku: "PS-AY-003", slug: "chyawanprash-500g", name: "Chyawanprash", brand: "Vedic Grove", manufacturer: "Vedic Grove Ayurveda Pvt Ltd", cat: "natural-wellness", system: "AYURVEDA", packSize: "500 g", mrp: 320, price: 285, ingredients: "Amla, ghee, honey, 40+ herbs", description: "Traditional herbal jam used as a seasonal wellness tonic.", usage: "1–2 teaspoons daily with warm milk or water.", warnings: "Contains sugar – diabetics should consult their doctor." },
    { sku: "PS-AY-004", slug: "avipattikar-churna", name: "Avipattikar Churna", brand: "PARMSUKH", ownBrand: true, manufacturer: "PARMSUKH Herbals", cat: "digestive-wellness", system: "AYURVEDA", packSize: "100 g", mrp: 180, price: 159, ingredients: "Trikatu, Triphala, Musta, Vidanga, Ela, Patra, Lavanga, Trivrit, Sharkara", description: "Classical formulation traditionally used for acidity and digestive comfort.", usage: "3 g with water before meals, or as directed.", warnings: "Seek medical advice for persistent heartburn, difficulty swallowing or weight loss." },
    { sku: "PS-AY-005", slug: "rasa-aushadhi-practitioner", name: "Rasa Aushadhi (Practitioner supply)", brand: "PARMSUKH", ownBrand: true, manufacturer: "PARMSUKH Herbals", cat: "ayurvedic-medicines", system: "AYURVEDA", packSize: "30 tablets", mrp: 600, price: 560, ingredients: "Contains processed minerals – see label", description: "Herbo-mineral Ayurvedic formulation supplied only against a practitioner prescription.", usage: "Only as prescribed by your practitioner.", warnings: "Prescription required. Contains processed minerals – must be taken only under medical supervision.", requiresPrescription: true, restricted: true, regulatoryInfo: "Schedule E(1) – to be taken under medical supervision" },
    { sku: "PS-HO-001", slug: "arnica-montana-30c", name: "Arnica Montana 30C", brand: "Homoeo Remedies Co.", manufacturer: "Homoeo Remedies Co.", cat: "homoeopathic-medicines", system: "HOMOEOPATHY", packSize: "30 ml dilution", mrp: 110, price: 99, ingredients: "Arnica montana 30C in alcohol base", description: "Homoeopathic dilution.", usage: "As directed by your homoeopathic practitioner.", warnings: "Contains alcohol. Seek medical care for injuries, severe pain or swelling." },
    { sku: "PS-HO-002", slug: "nux-vomica-30c", name: "Nux Vomica 30C", brand: "Homoeo Remedies Co.", manufacturer: "Homoeo Remedies Co.", cat: "homoeopathic-medicines", system: "HOMOEOPATHY", packSize: "30 ml dilution", mrp: 110, price: 99, ingredients: "Nux vomica 30C in alcohol base", description: "Homoeopathic dilution.", usage: "As directed by your homoeopathic practitioner.", warnings: "Contains alcohol." },
    { sku: "PS-HO-003", slug: "calendula-ointment", name: "Calendula Ointment", brand: "Homoeo Remedies Co.", manufacturer: "Homoeo Remedies Co.", cat: "skin-hair-care", system: "HOMOEOPATHY", packSize: "25 g", mrp: 95, price: 85, ingredients: "Calendula officinalis Q", description: "Homoeopathic topical ointment.", usage: "Apply externally as directed.", warnings: "For external use only. Do not apply on deep or infected wounds." },
    { sku: "PS-HB-001", slug: "tulsi-green-tea", name: "Tulsi Green Tea", brand: "Vedic Grove", manufacturer: "Vedic Grove Ayurveda Pvt Ltd", cat: "herbal-products", system: "HERBAL", packSize: "25 tea bags", mrp: 199, price: 169, ingredients: "Green tea, Tulsi (holy basil)", description: "A calming herbal infusion.", usage: "1 tea bag in hot water for 3 minutes.", warnings: "Contains caffeine." },
    { sku: "PS-PC-001", slug: "neem-face-wash", name: "Neem & Turmeric Face Wash", brand: "PARMSUKH", ownBrand: true, manufacturer: "PARMSUKH Herbals", cat: "personal-care", system: "HERBAL", packSize: "100 ml", mrp: 175, price: 149, ingredients: "Neem, turmeric, aloe vera", description: "Gentle herbal cleanser for daily use.", usage: "Massage onto damp skin and rinse.", warnings: "Patch test before use. Avoid contact with eyes.", gstPercent: 18 },
    { sku: "PS-HA-001", slug: "copper-water-bottle", name: "Copper Water Bottle", brand: "PARMSUKH", ownBrand: true, manufacturer: "Local artisan supplier", cat: "health-accessories", system: "OTHER", packSize: "1 litre", mrp: 999, price: 849, description: "Pure copper bottle for storing drinking water.", usage: "Fill with water overnight. Clean with lemon and salt weekly.", warnings: "Do not store acidic drinks.", gstPercent: 18 },
    { sku: "PS-BK-001", slug: "ayurveda-daily-routine-book", name: "Dinacharya: The Ayurvedic Daily Routine", brand: "PARMSUKH Press", ownBrand: true, manufacturer: "PARMSUKH Press", cat: "books", system: "OTHER", packSize: "Paperback, 160 pages", mrp: 299, price: 249, description: "An accessible introduction to Ayurvedic daily and seasonal routines.", usage: "", warnings: "Educational content – not a substitute for medical advice.", gstPercent: 0, returnEligible: false },
  ];

  for (const [i, p] of products.entries()) {
    const { cat, ...rest } = p;
    const prod = await db.product.upsert({
      where: { sku: p.sku }, update: {},
      create: { ...rest, categoryId: catId[cat], regulatoryInfo: p.regulatoryInfo ?? "Licence / registration details to be added after verification" },
    });
    if ((await db.productBatch.count({ where: { productId: prod.id } })) === 0) {
      const b = await db.productBatch.create({
        data: { productId: prod.id, batchNo: `B${2600 + i}`, mfgDate: ymd(-120), expiryDate: ymd(i === 8 ? 25 : 540), quantity: i === 10 ? 4 : 50 },
      });
      await db.stockMovement.create({ data: { productId: prod.id, batchId: b.id, change: b.quantity, reason: "PURCHASE" } });
    }
  }

  for (const c of [
    { code: "WELCOME10", percentOff: 10, maxOff: 200, appliesTo: "ALL" },
    { code: "FIRSTCONSULT", percentOff: 20, maxOff: 150, appliesTo: "CONSULTATION" },
  ]) await db.coupon.upsert({ where: { code: c.code }, update: {}, create: c });

  const settings = CLINIC_SETTINGS;
  for (const [key, value] of Object.entries(settings)) await db.clinicSetting.upsert({ where: { key }, update: {}, create: { key, value } });

  console.log("Seed complete. Staff password for all demo accounts:", PASSWORD);
}

main().finally(() => db.$disconnect());
