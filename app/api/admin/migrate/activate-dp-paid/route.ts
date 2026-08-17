import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiResponse } from "@/lib/utils/apiResponse";

/**
 * POST /api/admin/migrate/activate-dp-paid
 * Aktivasi semua booking DP_PAID yang belum ACTIVE (data lama sebelum flow diubah).
 * Endpoint sementara — jalankan sekali lalu bisa diabaikan.
 *
 * Akses: hanya dengan AUTH_SECRET di header x-migrate-secret
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-migrate-secret");
  if (secret !== process.env.AUTH_SECRET) {
    return apiResponse.error("Unauthorized", 401, "UNAUTHORIZED");
  }

  const candidates = await prisma.booking.findMany({
    where: { status: "DP_PAID" },
    include: { user: true },
  });

  let activated = 0;
  let errors = 0;
  const details: string[] = [];

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
            message: "Status sewa Anda kini AKTIF. Kamar resmi menjadi hak Anda.",
            related_booking_id: booking.id,
          },
        });
      });
      activated++;
      details.push(`✅ Booking ${booking.id} (${booking.user.name}) → ACTIVE`);
    } catch (err) {
      errors++;
      details.push(`❌ Booking ${booking.id} gagal: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return apiResponse.success(
    { activated, errors, total: candidates.length, details },
    `Selesai: ${activated} booking diaktifkan, ${errors} gagal.`
  );
}
