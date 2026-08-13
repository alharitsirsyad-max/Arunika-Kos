/**
 * Seed script — jalankan dengan: npm run db:seed
 *
 * Kondisi: fresh start — user belum ada booking sama sekali.
 * Idempotent: gunakan upsert dengan ID tetap.
 *
 * Akun:
 *   admin@arunikakos.com  / admin123!
 *   budi@example.com      / user1234   (identitas belum diupload)
 *   siti@example.com      / user1234   (identitas belum diupload)
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const IDS = {
  adminId:        "seed-user-admin-001",
  user1Id:        "seed-user-budi-001",
  user2Id:        "seed-user-siti-001",
  roomDeluxeId:   "room-deluxe-ac-001",
  roomStandardId: "room-standard-001",
} as const;

async function main() {
  console.log("🌱 Seeding database (fresh start — no bookings)...\n");

  // ── 1. Hapus data lama yang mungkin ada (urutan penting: FK dulu) ──────────
  console.log("🗑  Membersihkan data lama...");
  await prisma.payment.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.identityDocument.deleteMany({});
  await prisma.report.deleteMany({});
  // Reset semua unit ke AVAILABLE
  await prisma.roomUnit.updateMany({ data: { status: "AVAILABLE" } });
  console.log("✅ Data lama dibersihkan\n");

  // ── 2. Admin ───────────────────────────────────────────────────────────────
  const adminPwd = await hash("admin123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@arunikakos.com" },
    update: { password: adminPwd },
    create: {
      id: IDS.adminId,
      name: "Admin Arunika",
      email: "admin@arunikakos.com",
      password: adminPwd,
      phone: "081234567890",
      role: "ADMIN",
    },
  });
  console.log(`✅ Admin    : ${admin.email} / admin123!`);

  // ── 3. User Budi ──────────────────────────────────────────────────────────
  const userPwd = await hash("user1234", 12);
  const budi = await prisma.user.upsert({
    where: { email: "budi@example.com" },
    update: { password: userPwd },
    create: {
      id: IDS.user1Id,
      name: "Budi Santoso",
      email: "budi@example.com",
      password: userPwd,
      phone: "081200000001",
      role: "USER",
    },
  });
  console.log(`✅ User 1   : ${budi.email} / user1234  (belum upload identitas)`);

  // ── 4. User Siti ──────────────────────────────────────────────────────────
  const siti = await prisma.user.upsert({
    where: { email: "siti@example.com" },
    update: { password: userPwd },
    create: {
      id: IDS.user2Id,
      name: "Siti Rahayu",
      email: "siti@example.com",
      password: userPwd,
      phone: "081200000002",
      role: "USER",
    },
  });
  console.log(`✅ User 2   : ${siti.email} / user1234  (belum upload identitas)\n`);

  // ── 5. Kamar Deluxe AC ────────────────────────────────────────────────────
  const roomDeluxe = await prisma.room.upsert({
    where: { id: IDS.roomDeluxeId },
    update: {},
    create: {
      id: IDS.roomDeluxeId,
      name: "Kamar Deluxe AC",
      price: 1_500_000,
      description:
        "Kamar nyaman dengan AC, kasur spring bed, lemari, dan meja belajar. Cocok untuk mahasiswa dan pekerja.",
      facilities: ["AC", "Kasur Spring Bed", "Lemari", "Meja Belajar", "WiFi", "Kamar Mandi Dalam"],
      capacity: 3,
    },
  });

  // ── 6. Kamar Standard ─────────────────────────────────────────────────────
  const roomStandard = await prisma.room.upsert({
    where: { id: IDS.roomStandardId },
    update: {},
    create: {
      id: IDS.roomStandardId,
      name: "Kamar Standard",
      price: 800_000,
      description:
        "Kamar bersih dan nyaman dengan kipas angin. Tersedia kamar mandi bersama di lantai yang sama.",
      facilities: ["Kipas Angin", "Kasur Busa", "Lemari", "WiFi"],
      capacity: 4,
    },
  });

  console.log(`✅ Kamar    : ${roomDeluxe.name} (Rp 1.500.000/bln), ${roomStandard.name} (Rp 800.000/bln)`);

  // ── 7. Unit kamar Deluxe (3 unit, semua AVAILABLE) ────────────────────────
  for (const num of ["D1", "D2", "D3"]) {
    await prisma.roomUnit.upsert({
      where: { room_id_room_number: { room_id: roomDeluxe.id, room_number: num } },
      update: { status: "AVAILABLE" },
      create: { room_id: roomDeluxe.id, room_number: num, status: "AVAILABLE" },
    });
  }

  // ── 8. Unit kamar Standard (4 unit, semua AVAILABLE) ──────────────────────
  for (const num of ["S1", "S2", "S3", "S4"]) {
    await prisma.roomUnit.upsert({
      where: { room_id_room_number: { room_id: roomStandard.id, room_number: num } },
      update: { status: "AVAILABLE" },
      create: { room_id: roomStandard.id, room_number: num, status: "AVAILABLE" },
    });
  }

  console.log(`✅ Unit     : 3 unit Deluxe (D1–D3), 4 unit Standard (S1–S4) — semua AVAILABLE\n`);

  // ── Ringkasan ──────────────────────────────────────────────────────────────
  console.log("🎉 Seeding selesai! Kondisi awal:");
  console.log("──────────────────────────────────────────────────────");
  console.log("👤 Admin  : admin@arunikakos.com  / admin123!");
  console.log("👤 Budi   : budi@example.com      / user1234");
  console.log("👤 Siti   : siti@example.com      / user1234");
  console.log("──────────────────────────────────────────────────────");
  console.log("🏠 Kamar  : Deluxe AC (Rp 1.500.000), Standard (Rp 800.000)");
  console.log("📦 Unit   : semua AVAILABLE, belum ada booking");
  console.log("🪪 Identitas : belum ada (Budi & Siti harus upload dulu)");
  console.log("📋 Booking   : 0 — belum ada");
  console.log("──────────────────────────────────────────────────────");
  console.log("\nAlur test:");
  console.log("  1. Login sebagai Budi atau Siti");
  console.log("  2. Upload KTP di /dashboard/identity");
  console.log("  3. Admin verifikasi di /admin/identity");
  console.log("  4. User bisa booking kamar di /rooms");
  console.log("  5. Admin setujui booking di /admin/bookings");
  console.log("  6. User bayar invoice di /dashboard");
}

main()
  .catch((e) => {
    console.error("❌ Seed gagal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
