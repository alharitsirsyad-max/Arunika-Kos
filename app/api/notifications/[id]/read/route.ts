import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/errors/AppError";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/notifications/:id/read — tandai satu notifikasi sebagai dibaca
 * Auth: USER (login required, harus pemilik notifikasi)
 *
 * Response: { id, is_read: true }
 */
export async function PATCH(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session) throw new UnauthorizedError("Belum login");

    const userId = session.user!.id!;
    const { id } = await params;

    const notification = await prisma.notification.findUnique({
      where: { id },
      select: { id: true, user_id: true, is_read: true },
    });

    if (!notification) throw new NotFoundError("Notifikasi tidak ditemukan");

    if (notification.user_id !== userId) {
      throw new ForbiddenError("Anda tidak berhak mengubah notifikasi ini");
    }

    // Jika sudah dibaca, cukup kembalikan data tanpa update ulang
    if (notification.is_read) {
      return apiResponse.success(
        { id: notification.id, is_read: true },
        "Notifikasi sudah dibaca sebelumnya"
      );
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { is_read: true },
      select: { id: true, is_read: true },
    });

    return apiResponse.success(updated, "Notifikasi berhasil ditandai dibaca");
  } catch (error) {
    return handleError(error);
  }
}
