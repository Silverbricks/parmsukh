"use server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { nextDoctorCode, nextPatientCode, bookingRef } from "@/lib/ids";
import { normaliseMobile } from "@/lib/otp";
import { availableSlots, slotKey } from "@/lib/slots";
import { cancelOrderAndRestock } from "@/lib/orders";
import { notify } from "@/lib/notify";
import { ORDER_STATUSES, SERVICES, SYSTEMS, MODES } from "@/lib/constants";
import { num, optStr, str } from "@/lib/format";
import type { Role } from "@/lib/session";
import type { FormState } from "./auth";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const isUnique = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

// ───────────── Doctors ─────────────

export async function createDoctor(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requirePermission("doctors:manage");
  const name = str(fd, "name"), email = str(fd, "email").toLowerCase(), password = str(fd, "password");
  if (!name || !email) return { error: "Name and email are required." };
  if (password.length < 10) return { error: "Initial password must be at least 10 characters." };
  const mobile = optStr(fd, "mobile") ? normaliseMobile(str(fd, "mobile")) : null;
  let doctorId: string;
  try {
    const user = await db.user.create({ data: { role: "DOCTOR", name, email, mobile, passwordHash: await bcrypt.hash(password, 10) } });
    const d = await db.doctor.create({
      data: {
        userId: user.id, code: await nextDoctorCode(), slug: `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`,
        qualifications: str(fd, "qualifications") || "To be verified", specialisations: str(fd, "specialisations"),
        systems: fd.getAll("systems").map(String).filter((x) => x in SYSTEMS).join(",") || "GENERAL",
        fee: num(fd, "fee") ?? 500, followUpFee: num(fd, "followUpFee") ?? 0, slotMinutes: num(fd, "slotMinutes") ?? 20,
        experienceYears: num(fd, "experienceYears") ?? 0, languages: str(fd, "languages") || "English, Hindi, Punjabi", bio: str(fd, "bio"),
        availability: { create: [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, startTime: "10:00", endTime: "13:00" })) },
      },
    });
    doctorId = d.id;
  } catch (e) {
    if (isUnique(e)) return { error: "Email or mobile already in use." };
    throw e;
  }
  await audit(s, "DOCTOR_CREATED", "Doctor", doctorId);
  redirect(`/admin/doctors/${doctorId}`);
}

export async function updateDoctor(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requirePermission("doctors:manage");
  const id = str(fd, "id");
  const d = await db.doctor.findUnique({ where: { id } });
  if (!d) return { error: "Doctor not found." };
  await db.doctor.update({
    where: { id },
    data: {
      qualifications: str(fd, "qualifications"), registrationNo: optStr(fd, "registrationNo"), registrationBody: optStr(fd, "registrationBody"),
      specialisations: str(fd, "specialisations"), systems: fd.getAll("systems").map(String).filter((x) => x in SYSTEMS).join(",") || "GENERAL",
      experienceYears: num(fd, "experienceYears") ?? 0, languages: str(fd, "languages"), fee: num(fd, "fee") ?? d.fee, followUpFee: num(fd, "followUpFee") ?? 0,
      slotMinutes: Math.max(10, Math.min(120, num(fd, "slotMinutes") ?? 20)), clinicLocation: str(fd, "clinicLocation"), bio: str(fd, "bio"),
      onlineAvailable: fd.get("onlineAvailable") === "on", inPersonAvailable: fd.get("inPersonAvailable") === "on", phoneAvailable: fd.get("phoneAvailable") === "on",
      verified: fd.get("verified") === "on", active: fd.get("active") === "on",
    },
  });
  await db.user.update({ where: { id: d.userId }, data: { active: fd.get("active") === "on", name: str(fd, "name") || undefined } });
  await audit(s, "DOCTOR_UPDATED", "Doctor", id);
  revalidatePath(`/admin/doctors/${id}`);
  return { message: "Doctor profile saved." };
}

export async function saveAvailability(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requirePermission("doctors:manage");
  const doctorId = str(fd, "doctorId");
  const blocks: { weekday: number; startTime: string; endTime: string }[] = [];
  for (let wd = 0; wd < 7; wd++) {
    for (const b of [0, 1]) {
      const st = str(fd, `s_${wd}_${b}`), en = str(fd, `e_${wd}_${b}`);
      if (/^\d{2}:\d{2}$/.test(st) && /^\d{2}:\d{2}$/.test(en) && st < en) blocks.push({ weekday: wd, startTime: st, endTime: en });
    }
  }
  await db.$transaction([db.doctorAvailability.deleteMany({ where: { doctorId } }), db.doctorAvailability.createMany({ data: blocks.map((b) => ({ ...b, doctorId })) })]);
  await audit(s, "DOCTOR_AVAILABILITY_UPDATED", "Doctor", doctorId);
  revalidatePath(`/admin/doctors/${doctorId}`);
  return { message: "Working hours saved." };
}

export async function addLeave(fd: FormData) {
  const s = await requirePermission("doctors:manage");
  const doctorId = str(fd, "doctorId"), date = str(fd, "date");
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) await db.doctorLeave.create({ data: { doctorId, date, reason: optStr(fd, "reason") } });
  await audit(s, "DOCTOR_LEAVE_ADDED", "Doctor", doctorId, { date });
  revalidatePath(`/admin/doctors/${doctorId}`);
}

export async function removeLeave(fd: FormData) {
  await requirePermission("doctors:manage");
  const l = await db.doctorLeave.delete({ where: { id: str(fd, "id") } });
  revalidatePath(`/admin/doctors/${l.doctorId}`);
}

// ───────────── Staff ─────────────

const STAFF_ROLES: Role[] = ["DOCTOR_ADMIN", "RECEPTIONIST", "STORE_MANAGER", "ORDER_MANAGER", "SUPER_ADMIN"];

export async function createStaff(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requirePermission("staff:manage");
  const role = str(fd, "role") as Role;
  if (!STAFF_ROLES.includes(role)) return { error: "Choose a role." };
  if (role === "SUPER_ADMIN" && s.role !== "SUPER_ADMIN") return { error: "Only a Super Admin can create another Super Admin." };
  const password = str(fd, "password");
  if (password.length < 10) return { error: "Initial password must be at least 10 characters." };
  try {
    const u = await db.user.create({ data: { role, name: str(fd, "name"), email: str(fd, "email").toLowerCase(), passwordHash: await bcrypt.hash(password, 10) } });
    await audit(s, "STAFF_CREATED", "User", u.id, { role });
  } catch (e) {
    if (isUnique(e)) return { error: "Email already in use." };
    throw e;
  }
  revalidatePath("/admin/staff");
  return { message: "Staff account created." };
}

export async function toggleUser(fd: FormData) {
  const s = await requirePermission("staff:manage");
  const u = await db.user.findUnique({ where: { id: str(fd, "id") } });
  if (!u || u.id === s.uid || u.role === "PATIENT") return;
  if (u.role === "SUPER_ADMIN" && s.role !== "SUPER_ADMIN") return;
  await db.user.update({ where: { id: u.id }, data: { active: !u.active } });
  if (u.role === "DOCTOR") await db.doctor.updateMany({ where: { userId: u.id }, data: { active: !u.active } });
  await audit(s, u.active ? "USER_DEACTIVATED" : "USER_ACTIVATED", "User", u.id);
  revalidatePath("/admin/staff");
}

export async function resetStaffPassword(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requirePermission("staff:manage");
  const password = str(fd, "password");
  if (password.length < 10) return { error: "Password must be at least 10 characters." };
  const u = await db.user.findUnique({ where: { id: str(fd, "id") } });
  if (!u || u.role === "PATIENT" || (u.role === "SUPER_ADMIN" && s.role !== "SUPER_ADMIN")) return { error: "Not allowed." };
  await db.user.update({ where: { id: u.id }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  await audit(s, "PASSWORD_RESET", "User", u.id);
  return { message: `Password reset for ${u.name}.` };
}

// ───────────── Clinic settings & coupons ─────────────

export async function saveSettings(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requirePermission("clinic:manage");
  for (const key of ["clinic_name", "clinic_address", "clinic_phone", "clinic_email", "opening_hours", "holidays", "invoice_prefix", "gstin"]) {
    await db.clinicSetting.upsert({ where: { key }, create: { key, value: str(fd, key) }, update: { value: str(fd, key) } });
  }
  await audit(s, "SETTINGS_UPDATED", "ClinicSetting");
  revalidatePath("/admin/settings");
  return { message: "Settings saved." };
}

export async function createCoupon(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requirePermission("products:manage");
  const code = str(fd, "code").toUpperCase();
  const pct = num(fd, "percentOff") ?? 0;
  if (!/^[A-Z0-9]{3,20}$/.test(code) || pct < 1 || pct > 90) return { error: "Code (3–20 letters/numbers) and 1–90% discount required." };
  try {
    await db.coupon.create({ data: { code, percentOff: pct, maxOff: num(fd, "maxOff"), appliesTo: str(fd, "appliesTo") || "ALL", expiresAt: optStr(fd, "expiresAt") } });
  } catch (e) { if (isUnique(e)) return { error: "Coupon code exists." }; throw e; }
  await audit(s, "COUPON_CREATED", "Coupon", code);
  revalidatePath("/admin/coupons");
  return { message: "Coupon created." };
}

export async function toggleCoupon(fd: FormData) {
  await requirePermission("products:manage");
  const c = await db.coupon.findUnique({ where: { id: str(fd, "id") } });
  if (c) await db.coupon.update({ where: { id: c.id }, data: { active: !c.active } });
  revalidatePath("/admin/coupons");
}

// ───────────── Products & inventory ─────────────

function productData(fd: FormData) {
  return {
    name: str(fd, "name"), brand: str(fd, "brand"), manufacturer: str(fd, "manufacturer"), categoryId: str(fd, "categoryId"), system: str(fd, "system"),
    description: str(fd, "description"), ingredients: str(fd, "ingredients"), packSize: str(fd, "packSize"),
    mrp: num(fd, "mrp") ?? 0, price: num(fd, "price") ?? 0, gstPercent: num(fd, "gstPercent") ?? 12,
    usage: str(fd, "usage"), warnings: str(fd, "warnings"), regulatoryInfo: str(fd, "regulatoryInfo"),
    requiresPrescription: fd.get("requiresPrescription") === "on", restricted: fd.get("restricted") === "on",
    returnEligible: fd.get("returnEligible") === "on", active: fd.get("active") === "on", ownBrand: fd.get("ownBrand") === "on",
  };
}

export async function saveProduct(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requirePermission("products:manage");
  const id = optStr(fd, "id");
  const data = productData(fd);
  if (!data.name || !data.categoryId || !data.packSize || !data.mrp || !data.price) return { error: "Name, category, pack size, MRP and price are required." };
  if (data.price > data.mrp) return { error: "Selling price cannot exceed MRP." };
  if (data.requiresPrescription) data.restricted = true; // prescription items are never sold to guests
  try {
    if (id) {
      await db.product.update({ where: { id }, data });
      await audit(s, "PRODUCT_UPDATED", "Product", id);
      revalidatePath(`/admin/products/${id}`);
      return { message: "Product saved." };
    }
    const p = await db.product.create({ data: { ...data, sku: str(fd, "sku") || `PS-${Date.now().toString(36).toUpperCase()}`, slug: `${slugify(data.name)}-${Math.random().toString(36).slice(2, 6)}` } });
    await audit(s, "PRODUCT_CREATED", "Product", p.id);
    redirect(`/admin/products/${p.id}`);
  } catch (e) {
    if (isUnique(e)) return { error: "SKU already exists." };
    throw e;
  }
}

export async function addBatch(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requirePermission("products:manage");
  const productId = str(fd, "productId"), batchNo = str(fd, "batchNo"), mfgDate = str(fd, "mfgDate"), expiryDate = str(fd, "expiryDate");
  const quantity = num(fd, "quantity") ?? 0;
  if (!batchNo || !mfgDate || !expiryDate || quantity <= 0) return { error: "Batch number, manufacturing date, expiry date and quantity are mandatory." };
  if (expiryDate <= mfgDate) return { error: "Expiry must be after manufacturing date." };
  try {
    const b = await db.productBatch.create({ data: { productId, batchNo, mfgDate, expiryDate, quantity } });
    await db.stockMovement.create({ data: { productId, batchId: b.id, change: quantity, reason: "PURCHASE", userId: s.uid } });
  } catch (e) { if (isUnique(e)) return { error: "This batch number already exists for the product." }; throw e; }
  await audit(s, "BATCH_ADDED", "Product", productId, { batchNo, quantity });
  revalidatePath(`/admin/products/${productId}`);
  return { message: "Batch added." };
}

export async function adjustStock(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requirePermission("products:manage");
  const batch = await db.productBatch.findUnique({ where: { id: str(fd, "batchId") } });
  const change = num(fd, "change") ?? 0;
  const reason = ["ADJUSTMENT", "EXPIRED", "RETURN"].includes(str(fd, "reason")) ? str(fd, "reason") : "ADJUSTMENT";
  if (!batch || !change) return { error: "Choose a batch and a non-zero quantity." };
  if (batch.quantity + change < 0) return { error: "Stock cannot go below zero." };
  await db.productBatch.update({ where: { id: batch.id }, data: { quantity: { increment: change } } });
  await db.stockMovement.create({ data: { productId: batch.productId, batchId: batch.id, change, reason, userId: s.uid } });
  await audit(s, "STOCK_ADJUSTED", "ProductBatch", batch.id, { change, reason });
  revalidatePath(`/admin/products/${batch.productId}`);
  return { message: "Stock updated." };
}

export async function createCategory(fd: FormData) {
  await requirePermission("products:manage");
  const name = str(fd, "name");
  if (name) await db.category.create({ data: { name, slug: slugify(name) } }).catch(() => null);
  revalidatePath("/admin/products");
}

// ───────────── Orders ─────────────

export async function updateOrder(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requirePermission("orders:manage");
  const o = await db.order.findUnique({ where: { id: str(fd, "id") } });
  if (!o) return { error: "Order not found." };
  const status = str(fd, "status");
  if (!(ORDER_STATUSES as readonly string[]).includes(status)) return { error: "Invalid status." };
  if (status === "CANCELLED") {
    await cancelOrderAndRestock(o.id, s.uid, str(fd, "note") || "Cancelled by store");
  } else {
    await db.order.update({
      where: { id: o.id },
      data: {
        status, courier: optStr(fd, "courier") ?? o.courier, trackingNo: optStr(fd, "trackingNo") ?? o.trackingNo,
        paymentStatus: status === "DELIVERED" && o.paymentMethod === "COD" ? "PAID" : o.paymentStatus,
        ...(status !== o.status ? { events: { create: { status, note: optStr(fd, "note"), userId: s.uid } } } : {}),
      },
    });
    if (status === "RETURNED") {
      // Returned goods are quarantined, not automatically restocked.
      await db.order.update({ where: { id: o.id }, data: { paymentStatus: o.paymentStatus === "PAID" ? "REFUND_REQUESTED" : o.paymentStatus } });
    }
    if (status !== o.status && ["DISPATCHED", "DELIVERED"].includes(status))
      await notify({ mobile: o.mobile, channel: "SMS", subject: `Order ${status.toLowerCase()}`, message: `PARMSUKH: order ${o.number} is ${status.toLowerCase()}.` });
  }
  await audit(s, "ORDER_UPDATED", "Order", o.id, { status });
  revalidatePath(`/admin/orders/${o.id}`);
  return { message: "Order updated." };
}

export async function markRefunded(fd: FormData) {
  const s = await requirePermission("orders:manage");
  const o = await db.order.findUnique({ where: { id: str(fd, "id") } });
  if (!o || o.paymentStatus !== "REFUND_REQUESTED") return;
  await db.order.update({ where: { id: o.id }, data: { paymentStatus: "REFUNDED", events: { create: { status: o.status, note: "Refund processed", userId: s.uid } } } });
  await db.payment.create({ data: { kind: "ORDER", refId: o.id, amount: -o.total, method: o.paymentMethod, status: "REFUNDED" } });
  await audit(s, "ORDER_REFUNDED", "Order", o.id);
  revalidatePath(`/admin/orders/${o.id}`);
}

// ───────────── Appointments & reception ─────────────

export async function adminAppointment(fd: FormData) {
  const s = await requirePermission("appointments:manage");
  const a = await db.appointment.findUnique({ where: { id: str(fd, "id") } });
  if (!a) return;
  const op = str(fd, "op");
  if (op === "cancel") await db.appointment.update({ where: { id: a.id }, data: { status: "CANCELLED", slotKey: null, cancelReason: "Cancelled by clinic", paymentStatus: a.paymentStatus === "PAID" ? "REFUND_REQUESTED" : a.paymentStatus } });
  if (op === "paid") {
    await db.appointment.update({ where: { id: a.id }, data: { paymentStatus: "PAID" } });
    await db.payment.create({ data: { kind: "APPOINTMENT", refId: a.id, amount: a.fee - a.discount, method: "CLINIC_COUNTER", status: "PAID" } });
  }
  if (op === "refunded" && a.paymentStatus === "REFUND_REQUESTED") await db.appointment.update({ where: { id: a.id }, data: { paymentStatus: "REFUNDED" } });
  if (op === "confirm") await db.appointment.update({ where: { id: a.id }, data: { status: "CONFIRMED" } });
  if (op === "no_show") await db.appointment.update({ where: { id: a.id }, data: { status: "NO_SHOW" } });
  if (op === "cancel") {
    const mobile = a.guestMobile ?? (a.patientId ? (await db.patient.findUnique({ where: { id: a.patientId } }))?.mobile : null);
    if (mobile) await notify({ mobile, channel: "SMS", subject: "Booking cancelled", message: `PARMSUKH: booking ${a.ref} has been cancelled by the clinic. Please call us to rebook.` });
  }
  await audit(s, `APPOINTMENT_${op.toUpperCase()}`, "Appointment", a.id);
  revalidatePath("/admin/appointments");
}

export async function rescheduleAppointment(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requirePermission("appointments:manage");
  const a = await db.appointment.findUnique({ where: { id: str(fd, "id") } });
  if (!a || !["CONFIRMED", "REQUESTED"].includes(a.status)) return { error: "Only active bookings can be rescheduled." };
  const date = str(fd, "date"), time = str(fd, "time");
  if (!(await availableSlots(a.doctorId, date)).includes(time)) return { error: "That slot is not available." };
  try {
    await db.appointment.update({ where: { id: a.id }, data: { date, time, slotKey: slotKey(a.doctorId, date, time) } });
  } catch (e) { if (isUnique(e)) return { error: "Slot was just taken." }; throw e; }
  await audit(s, "APPOINTMENT_RESCHEDULED", "Appointment", a.id, { date, time });
  revalidatePath("/admin/appointments");
  return { message: "Rescheduled." };
}

export async function receptionBook(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requirePermission("appointments:manage");
  const mobile = normaliseMobile(str(fd, "mobile"));
  const doctorId = str(fd, "doctorId"), date = str(fd, "date"), time = str(fd, "time");
  const system = str(fd, "system"), service = str(fd, "service"), mode = str(fd, "mode");
  if (!mobile || !str(fd, "firstName")) return { error: "Patient name and mobile are required." };
  if (!(system in SYSTEMS) || !(service in SERVICES) || !(mode in MODES)) return { error: "Choose therapy, service and mode." };
  const doctor = await db.doctor.findUnique({ where: { id: doctorId } });
  if (!doctor) return { error: "Choose a doctor." };
  if (!(await availableSlots(doctorId, date)).includes(time)) return { error: "That slot is not available." };
  let patient = await db.patient.findUnique({ where: { mobile } });
  if (!patient) patient = await db.patient.create({ data: { patientCode: await nextPatientCode(), mobile, firstName: str(fd, "firstName"), lastName: str(fd, "lastName"), createdById: s.uid } });
  try {
    const a = await db.appointment.create({
      data: {
        ref: bookingRef(), doctorId, patientId: patient.id, mobileVerified: true, system, service, mode, date, time, slotKey: slotKey(doctorId, date, time),
        status: "CONFIRMED", concern: optStr(fd, "concern"), fee: service === "FOLLOW_UP" && doctor.followUpFee ? doctor.followUpFee : doctor.fee,
      },
    });
    await notify({ mobile, channel: "SMS", subject: "Booking confirmed", message: `PARMSUKH: consultation ${a.ref} confirmed for ${date} at ${time}.` });
    await audit(s, "APPOINTMENT_BOOKED_RECEPTION", "Appointment", a.id);
    revalidatePath("/admin/appointments");
    return { message: `Booked ${a.ref} for ${patient.firstName} (${patient.patientCode}).` };
  } catch (e) { if (isUnique(e)) return { error: "Slot was just taken." }; throw e; }
}

export async function adminSlots(doctorId: string, date: string) {
  await requirePermission("appointments:manage");
  return availableSlots(doctorId, date);
}
