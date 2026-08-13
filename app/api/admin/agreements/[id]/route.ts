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
 * GET /api/admin/agreements/:id
 * Admin mengambil Agreement berdasarkan booking_id (bukan agreement id).
 * Route param `id` adalah booking_id.
 *
 * Requirements: 3.6
 */
export async function GET(_req: NextRequest, { params }: Params) {
  // Route param `id` adalah booking_id, bukan agreement id
  const { id: bookingId } = await params;

  try {
    const session = await auth();
    if (!session) throw new UnauthorizedError("Belum login");
    if ((session.user as { role: string }).role !== "ADMIN") {
      throw new ForbiddenError("Hanya admin yang dapat melihat data agreement");
    }

    const agreement = await prisma.agreement.findFirst({
      where: { booking_id: bookingId },
      include: {
        confirmer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!agreement) {
      throw new NotFoundError(
        `Agreement untuk booking ${bookingId} tidak ditemukan`
      );
    }

    return apiResponse.success(agreement, "Berhasil mengambil data agreement");
  } catch (error) {
    return handleError(error);
  }
}
