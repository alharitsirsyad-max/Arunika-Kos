import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors/AppError";

/**
 * GET /api/admin/extensions — daftar semua permintaan perpanjangan
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session) throw new UnauthorizedError("Belum login");
    if ((session.user as { role: string }).role !== "ADMIN") {
      throw new ForbiddenError("Hanya admin");
    }

    const requests = await prisma.extensionRequest.findMany({
      orderBy: { created_at: "desc" },
      include: {
        booking: {
          select: {
            id: true,
            duration_periods: true,
            status: true,
            user: { select: { id: true, name: true, email: true } },
            room_unit: {
              select: {
                room_number: true,
                room: { select: { name: true, period_months: true } },
              },
            },
          },
        },
      },
    });

    return apiResponse.success(requests, "Berhasil mengambil daftar permintaan perpanjangan");
  } catch (error) {
    return handleError(error);
  }
}
