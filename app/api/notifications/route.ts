import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import { UnauthorizedError } from "@/lib/errors/AppError";

/**
 * GET /api/notifications — ambil daftar notifikasi milik user yang login
 * Auth: USER (login required)
 *
 * Query params:
 *   ?limit=20   — jumlah notifikasi per halaman (default 20)
 *   ?offset=0   — posisi mulai (default 0)
 *
 * Response: { notifications[], unread_count, total }
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) throw new UnauthorizedError("Belum login");

    const userId = session.user!.id!;

    const { searchParams } = req.nextUrl;
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 1), 100);
    const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0);

    const [notifications, unread_count, total] = await Promise.all([
      prisma.notification.findMany({
        where: { user_id: userId },
        orderBy: { created_at: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          type: true,
          message: true,
          is_read: true,
          related_booking_id: true,
          created_at: true,
        },
      }),
      prisma.notification.count({
        where: { user_id: userId, is_read: false },
      }),
      prisma.notification.count({
        where: { user_id: userId },
      }),
    ]);

    return apiResponse.success(
      { notifications, unread_count, total },
      "Berhasil mengambil notifikasi"
    );
  } catch (error) {
    return handleError(error);
  }
}
