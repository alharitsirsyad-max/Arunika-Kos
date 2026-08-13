import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import { UnauthorizedError } from "@/lib/errors/AppError";

/**
 * GET /api/bookings/my-active
 * Cek apakah user memiliki booking aktif (PENDING/APPROVED/ACTIVE).
 * Digunakan frontend untuk disable tombol booking jika sudah punya.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session) throw new UnauthorizedError("Belum login");

    const userId = session.user!.id!;

    const activeBooking = await prisma.booking.findFirst({
      where: {
        user_id: userId,
        status: { in: ["PENDING", "APPROVED", "ACTIVE"] },
      },
      select: {
        id: true,
        status: true,
        room_unit: {
          select: { room: { select: { name: true } } },
        },
      },
    });

    return apiResponse.success(
      { has_active: !!activeBooking, booking: activeBooking ?? null },
      "Status booking aktif berhasil diambil"
    );
  } catch (error) {
    return handleError(error);
  }
}
