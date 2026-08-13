import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import { UnauthorizedError } from "@/lib/errors/AppError";

/**
 * PATCH /api/notifications/read-all — tandai semua notifikasi user sebagai dibaca
 * Auth: USER (login required)
 *
 * Hanya menandai notifikasi milik user yang sedang login.
 *
 * Response: { updated_count }
 */
export async function PATCH() {
  try {
    const session = await auth();
    if (!session) throw new UnauthorizedError("Belum login");

    const userId = session.user!.id!;

    const result = await prisma.notification.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true },
    });

    return apiResponse.success(
      { updated_count: result.count },
      "Semua notifikasi berhasil ditandai dibaca"
    );
  } catch (error) {
    return handleError(error);
  }
}
