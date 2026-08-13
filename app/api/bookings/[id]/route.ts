import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { bookingService } from "@/lib/services/booking.service";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors/AppError";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/bookings/:id — detail satu booking
 * - Cek login (401 jika belum)
 * - Panggil bookingService.getBookingById() yang menangani IDOR check
 * - Log akses ke endpoint sensitif dan log jika akses ditolak
 *
 * Requirements: 1.2, 9.1, 9.2, 9.3, 14.4, 17.2
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;

  try {
    const session = await auth();
    if (!session) {
      throw new UnauthorizedError("Belum login");
    }

    const userId = session.user!.id!;
    const role = (session.user as { role: string }).role;

    const booking = await bookingService.getBookingById(id, userId, role);

    // Log akses sukses ke endpoint sensitif (Requirement 14.4)
    console.info(
      `[AUDIT] ${new Date().toISOString()} user=${userId} GET /api/bookings/${id} result=success`
    );

    return apiResponse.success(booking, "Berhasil mengambil data booking");
  } catch (error) {
    // Log jika akses ditolak (Requirement 9.3) atau error lainnya (Requirement 14.4)
    if (error instanceof ForbiddenError) {
      console.warn(
        `[SECURITY] ${new Date().toISOString()} GET /api/bookings/${id} akses ditolak: ${error.message}`
      );
    } else {
      console.info(
        `[AUDIT] ${new Date().toISOString()} GET /api/bookings/${id} result=error`
      );
    }
    return handleError(error);
  }
}
