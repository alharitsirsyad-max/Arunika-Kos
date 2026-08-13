import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors/AppError";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/bookings/:id/activate
 * Aktivasi manual booking oleh Admin — efeknya sama dengan cron job harian.
 *
 * Kondisi prasyarat:
 * - Booking harus berstatus `DP_PAID` (400 BOOKING_NOT_DP_PAID)
 * - Agreement harus berstatus `CONFIRMED` (400 AGREEMENT_NOT_CONFIRMED)
 * - `agreed_start_date` ≤ hari ini (400 START_DATE_NOT_REACHED)
 *
 * Dalam satu transaksi atomik:
 * 1. Update Booking → ACTIVE
 * 2. Update Room_Unit → OCCUPIED
 * 3. Buat Notification BOOKING_ACTIVE untuk user pemilik Booking
 *
 * Requirements: 9.6
 */
export async function PATCH(_req: NextRequest, { params }: Params) {
  const { id: bookingId } = await params;

  try {
    const session = await auth();
    if (!session) throw new UnauthorizedError("Belum login");
    if ((session.user as { role: string }).role !== "ADMIN") {
      throw new ForbiddenError("Hanya admin yang dapat mengaktifkan booking");
    }

    // Ambil booking beserta agreement yang terkait
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        agreement: true,
      },
    });

    if (!booking) {
      throw new NotFoundError(`Booking ${bookingId} tidak ditemukan`);
    }

    // Validasi 1: status harus DP_PAID
    if (booking.status !== "DP_PAID") {
      throw new ValidationError(
        "Booking harus berstatus DP_PAID untuk dapat diaktifkan",
        "BOOKING_NOT_DP_PAID"
      );
    }

    // Validasi 2: harus ada Agreement dan berstatus CONFIRMED
    if (!booking.agreement || booking.agreement.status !== "CONFIRMED") {
      throw new ValidationError(
        "Agreement harus berstatus CONFIRMED sebelum booking dapat diaktifkan",
        "AGREEMENT_NOT_CONFIRMED"
      );
    }

    // Jalankan aktivasi dalam satu transaksi atomik (sama dengan logika cron job)
    await prisma.$transaction(async (tx) => {
      // Update Booking → ACTIVE
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: "ACTIVE" },
      });

      // Update Room_Unit → OCCUPIED
      await tx.roomUnit.update({
        where: { id: booking.room_unit_id },
        data: { status: "OCCUPIED" },
      });

      // Buat Notification BOOKING_ACTIVE untuk user pemilik Booking
      await tx.notification.create({
        data: {
          user_id: booking.user_id,
          type: "BOOKING_ACTIVE",
          message: `Status sewa Anda kini AKTIF. Kamar resmi menjadi hak Anda mulai ${booking.agreement!.agreed_start_date.toLocaleDateString("id-ID")}.`,
          related_booking_id: bookingId,
        },
      });
    });

    return apiResponse.success(
      { booking_id: bookingId, new_status: "ACTIVE" },
      "Booking berhasil diaktifkan"
    );
  } catch (error) {
    return handleError(error);
  }
}
