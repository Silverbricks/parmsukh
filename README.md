# PARMSUKH – Patient, Doctor & E-Commerce Platform (SRS v3.0)

PARMSUKH Ayurveda & Homoeopathy Centre · *Traditional Wisdom. Holistic Wellbeing.*

One Next.js 15 app (TypeScript, Prisma, Tailwind) with four portals on a shared backend:

| Portal | Route | Who |
|---|---|---|
| Public website & store | `/`, `/store`, `/book-consultation`, `/track-order` | Everyone, guests included |
| Patient portal | `/login`, `/register`, `/dashboard/*` | Registered patients (mobile OTP) |
| Doctor Panel | `/doctor/*` (or `doctor.<domain>`) | Practitioners |
| Doctor Admin | `/admin/*` (or `admin.<domain>`) | Super Admin, Doctor Admin, Receptionist, Store Manager, Order Manager |

## Run locally

```bash
npm install
npx prisma db push      # creates prisma/dev.db (SQLite)
npm run db:seed         # demo data
npm run dev             # http://localhost:3000
```

`npm run db:reset` wipes the database and re-seeds it.

### Demo accounts (password `Parmsukh@123`, login at `/staff-login`)

| Email | Role |
|---|---|
| dr.darshan@parmsukh.com | Doctor (Dr Darshan Bhogal) |
| admin@parmsukh.com | Doctor Admin |
| superadmin@parmsukh.com | Super Admin |
| reception@parmsukh.com | Receptionist |
| store@parmsukh.com | Pharmacy / Store Manager |
| orders@parmsukh.com | Order Manager |

Demo patient: mobile **9876543210** at `/login`. With `DEV_SHOW_OTP=true` the OTP is shown on screen and in the server log, because no SMS provider is connected yet.

## What's implemented

- **Roles & security:** RBAC per role (`src/lib/rbac.ts`). The Doctor Admin has no clinical access. A doctor can open a patient's clinical record only if they have an appointment or consultation with that patient. Sensitive categories need explicit consent. Every login, clinical-record view, change and order is audit-logged. Sessions are httpOnly JWT cookies with role-based timeouts, and OTPs are rate-limited. Uploads are type-checked by file content and stored outside the web root, with authorised download only.
- **Guest flows:** booking with OTP-verified mobile, guest checkout, and order tracking by order number plus OTP. When a guest registers with the same mobile, their earlier bookings and orders link to the account, with no duplicate patient records.
- **Booking:** real-time slots from doctor hours, leave and clinic holidays. Double-booking is blocked by a database unique key. Includes coupons, a test payment option, cancel and reschedule, and a video-link field.
- **Patient portal:** dashboard, profile and addresses, case history (medical history, category questionnaires, timeline), consultations, approved summaries (printable), prescriptions, report uploads, follow-up progress, orders and payments, consent management, data export and correction requests.
- **Doctor Panel:** dashboard, appointments (day/week/month), patient directory and registration, a full patient record, and a 7-step consultation workspace. The workspace covers SOAP notes, the dedicated Homoeopathy and Ayurveda case records, safety screening and referral, private notes, prescriptions (clinical prescriptions kept separate from wellness recommendations) and practitioner approval, follow-up and progress status, and a branded printable report.
- **Safety engine** (`src/lib/safety.ts`): red-flag questionnaire answers and free-text keywords trigger emergency, urgent or prompt referral advice (112, Tele-MANAS 14416). A consultation can't be completed until safety screening is done and any referral is documented.
- **Store & inventory:** categories, search, product detail with batch and expiry, cart, server-side pricing (GST-inclusive, coupons, shipping). Stock is allocated first-expiry-first-out, and expired batches are excluded from sale automatically. Prescription-only and restricted products need a logged-in patient with a valid approved prescription. Cancelling an order restocks it.
- **Admin:** dashboard KPIs, doctor management (profile, fees, modes, hours, leave, verification), staff and permissions, patient registry (demographics only), reception bookings, products, batches and stock adjustments, coupons, orders (status, tracking, refunds, printable invoice), reports and analytics, audit log (Super Admin only), and clinic settings.

## Not yet connected / before go-live

- **Payment gateway** (Razorpay/PayU): currently a test option. **SMS/WhatsApp/email:** messages queue in the `Notification` table. **Video consultations:** the doctor pastes a meeting link.
- **2FA for doctors and admins** is required by SRS §12 and is **not yet implemented**. Patient passwords are not offered either; patients log in by OTP only.
- PDFs come from the browser's print-to-PDF on branded print layouts; there's no server-side PDF generation.
- Production setup: switch the Prisma provider to `postgresql`, set a strong `AUTH_SECRET`, set `DEV_SHOW_OTP=false`, put encrypted storage behind `STORAGE_DIR` (or a private bucket), and configure HTTPS and backups.
- Legal and compliance review (DPDP Act 2023, AYUSH and drug advertising rules, pharmacy licensing). The privacy policy is a draft. Verify the clinic's PIN code and the doctor's registration before they appear on official documents.

## Deploying (Coolify)

The production server runs Coolify. In Coolify go to **+ New → Private Repository → `parmsukh`**, then:

1. **Build Pack:** Docker Compose, with compose file `/docker-compose.prod.yml`.
2. **Domain:** on the `parmsukh` service, set e.g. `https://www.parmsukh.com,https://parmsukh.com`.
3. **Environment variables:** add `SEED_SUPERADMIN_EMAIL` and `SEED_SUPERADMIN_PASSWORD` (14+ characters). Coolify generates `AUTH_SECRET` automatically.
4. **Deploy,** then sign in at `/staff-login`. After that, delete `SEED_SUPERADMIN_PASSWORD` from Coolify.

What runs in production:

- **Data:** the database (SQLite) and uploaded reports live in the `parmsukh-data` volume. Back it up through Coolify or the Hostinger VPS backups.
- **Production mode:** it seeds no demo accounts and never shows OTP codes on screen.
- **⚠️ Patient login** needs an SMS provider, which isn't connected yet. Until it is, only staff can sign in.
