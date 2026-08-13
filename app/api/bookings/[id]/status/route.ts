import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bookingService } from "@/lib/services/booking.service";
import { updateBookingStatusSchema } from "@/lib/validations/booking";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import {
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  NotFoundError,
} from "@/lib/errors/AppError";
import { isValidBookingTransition } from "@/lib/utils/booking-state";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/bookings/:id/status — approve atau reject booking (admin only)
 *
 * 1. Cek session → UnauthorizedError (401) jika belum login.
 * 2. Cek role ADMIN → ForbiddenError (403) + log [SECURITY] jika bukan ADMIN.
 *    Log mencakup: timestamp, userId, IP, endpoint.
 * 3. Validasi body `{ status: "DP_PENDING" | "REJECTED" }` via Zod →
 *    ValidationError (400) jika tidak valid.
 * 4. Validasi transisi status menggunakan isValidBookingTransition.
 *    → 400 INVALID_TRANSITION jika transisi tidak valid.
 * 5+6. Delegate semua ke bookingService.updateBookingStatus (conflict check sudah ada di service).
 * 7. Return apiResponse.success(booking, 'Status booking berhasil diubah').
 *
 * Requirements: 3.1, 3.4
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;

  try {
    // Step 1: Cek session
    const session = await auth();
    if (!session) {
      throw new UnauthorizedError("Belum login");
    }

    const userId = session.user!.id!;
    const role = (session.user as { role: string }).role;

    // Step 2: Cek role ADMIN — log [SECURITY] jika bukan ADMIN (Req 9.4, 9.5, 14.2)
    if (role !== "ADMIN") {
      const ip =
        req.headers.get("x-forwarded-for") ??
        req.headers.get("x-real-ip") ??
        "unknown";

      console.warn(
        `[SECURITY] ${new Date().toISOString()} | Non-admin tried PATCH /api/bookings/${id}/status | userId=${userId} | ip=${ip}`
      );

      throw new ForbiddenError(
        "Hanya admin yang dapat mengubah status booking"
      );
    }

    // Step 3: Validasi body
    const body = await req.json();
    const parsed = updateBookingStatusSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        `Validasi gagal: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`
      );
    }

    // Step 4: Ambil booking saat ini untuk validasi transisi
    const booking = await prisma.booking.findUnique({
      where: { id },
      select: { id: true, status: true, room_unit_id: true, total_price: true },
    });

    if (!booking) {
      throw new NotFoundError(`Booking dengan ID ${id} tidak ditemukan`);
    }

    const { status: targetStatus } = parsed.data;

    // Validasi transisi menggunakan state machine
    if (!isValidBookingTransition(booking.status, targetStatus)) {
      return apiResponse.error(
        "Transisi status tidak valid",
        400,
        "INVALID_TRANSITION"
      );
    }

    // Step 5+6: Delegate ke service — conflict check, invoice creation, dan validation ada di sana
    const result = await bookingService.updateBookingStatus(id, parsed.data);

    // Step 7: Return response sukses
    return apiResponse.success(result, "Status booking berhasil diubah");
  } catch (error) {
    return handleError(error);
  }
}
