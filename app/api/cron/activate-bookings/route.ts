/**
 * POST /api/cron/activate-bookings
 *
 * Cron job yang dijalankan setiap hari pukul 06:00 WIB (0 23 * * * UTC).
 * Fallback: aktivasi booking DP_PAID yang belum aktif karena webhook gagal.
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

  let activated = 0;
  let errors = 0;

  // Query semua Booking DP_PAID yang belum ACTIVE (fallback jika webhook gagal)
  const candidates = await prisma.booking.findMany({
    where: { status: "DP_PAID" },
    include: { user: true },
  });

  for (const booking of candidates) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: "ACTIVE" },
        });

        await tx.roomUnit.update({
          where: { id: booking.room_unit_id },
          data: { status: "OCCUPIED" },
        });

        await tx.notification.create({
          data: {
            user_id: booking.user_id,
            type: "BOOKING_ACTIVE",
            message: `Status sewa Anda kini AKTIF. Kamar resmi menjadi hak Anda.`,
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
