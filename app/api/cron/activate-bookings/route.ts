/**
 * POST /api/cron/activate-bookings
 *
 * Cron job yang dijalankan setiap hari pukul 06:00 WIB (0 23 * * * UTC).
 * Mengaktifkan Booking yang memenuhi ketiga kondisi:
 *   1. status = DP_PAID
 *   2. Agreement status = CONFIRMED
 *   3. agreed_start_date ≤ today
 *
 * Untuk setiap booking yang memenuhi syarat, jalankan transaksi atomik:
 *   - Update Booking → ACTIVE
 *   - Update RoomUnit → OCCUPIED
 *   - Buat Notification BOOKING_ACTIVE
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  // Validasi Authorization header dengan CRON_SECRET
  const auth = request.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Gunakan UTC midnight hari ini agar konsisten di semua timezone
  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  let activated = 0;
  let errors = 0;

  // Query semua Booking yang memenuhi kondisi aktivasi
  const candidates = await prisma.booking.findMany({
    where: {
      status: "DP_PAID",
      agreement: {
        status: "CONFIRMED",
        agreed_start_date: { lte: today },
      },
    },
    include: {
      agreement: true,
      user: true,
    },
  });

  // Proses setiap booking secara individual dengan try/catch terpisah
  // agar error pada satu booking tidak menghentikan iterasi
  for (const booking of candidates) {
    try {
      await prisma.$transaction(async (tx) => {
        // Update Booking → ACTIVE
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: "ACTIVE" },
        });

        // Update RoomUnit → OCCUPIED
        await tx.roomUnit.update({
          where: { id: booking.room_unit_id },
          data: { status: "OCCUPIED" },
        });

        // Buat Notification BOOKING_ACTIVE untuk user pemilik booking
        await tx.notification.create({
          data: {
            user_id: booking.user_id,
            type: "BOOKING_ACTIVE",
            message: `Status sewa Anda kini AKTIF. Kamar resmi menjadi hak Anda mulai ${booking.agreement!.agreed_start_date.toLocaleDateString("id-ID")}.`,
            related_booking_id: booking.id,
          },
        });
      });

      activated++;
    } catch (err) {
      console.error(`[CRON] Gagal aktivasi booking ${booking.id}:`, err);
      errors++;
    }
  }

  const skipped = candidates.length - activated - errors;

  return Response.json({ activated, skipped, errors });
}
