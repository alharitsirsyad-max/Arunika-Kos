import { auth } from "@/lib/auth";
import { identityService } from "@/lib/services/identity.service";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import { UnauthorizedError } from "@/lib/errors/AppError";

/**
 * GET /api/identity-documents/status — status verifikasi identitas ringkas
 * Auth: USER (login required)
 *
 * Returns: { is_verified, has_pending, has_rejected }
 *
 * Endpoint ini ringan, dipakai frontend sebelum menampilkan tombol booking.
 * Validasi sesungguhnya tetap di BookingService.createBooking() — ini hanya untuk UX.
 *
 * Requirements: 20.5, 20.6, 20.7, 17.1–17.4
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      throw new UnauthorizedError("Belum login");
    }

    const userId = session.user!.id!;
    const status = await identityService.getMyIdentityStatus(userId);

    return apiResponse.success(status, "Berhasil mengambil status verifikasi identitas");
  } catch (error) {
    return handleError(error);
  }
}
