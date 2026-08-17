import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import { UnauthorizedError, ForbiddenError, NotFoundError } from "@/lib/errors/AppError";

const schema = z.object({
  reason: z.string().min(1, "Alasan wajib diisi").max(500),
});

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/users/:id/block — blokir user
 * Membatalkan semua booking pending user secara otomatis.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session) throw new UnauthorizedError("Belum login");
    if ((session.user as { role: string }).role !== "ADMIN") {
      throw new ForbiddenError("Hanya admin");
    }

    const { id: userId } = await params;
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiResponse.error("Alasan wajib diisi", 400, "VALIDATION_ERROR");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError("User tidak ditemukan");
    if (user.role === "ADMIN") {
      return apiResponse.error("Tidak dapat memblokir admin", 400, "CANNOT_BLOCK_ADMIN");
    }

    await prisma.$transaction(async (tx) => {
      // Blokir user
      await tx.user.update({
        where: { id: userId },
        data: {
          is_blocked: true,
          blocked_reason: parsed.data.reason,
          blocked_at: new Date(),
        },
      });

      // Batalkan semua booking PENDING dan DP_PENDING
      const pendingBookings = await tx.booking.findMany({
        where: { user_id: userId, status: { in: ["PENDING", "DP_PENDING"] } },
        select: { id: true },
      });

      if (pendingBookings.length > 0) {
        const bookingIds = pendingBookings.map((b) => b.id);

        await tx.booking.updateMany({
          where: { id: { in: bookingIds } },
          data: { status: "CANCELLED", cancellation_message: `Akun diblokir: ${parsed.data.reason}` },
        });

        // Batalkan invoice DP yang unpaid
        await tx.invoice.updateMany({
          where: { booking_id: { in: bookingIds }, type: "DP", status: "UNPAID" },
          data: { status: "CANCELLED" },
        });

        // Bebaskan unit yang RESERVED
        for (const booking of await tx.booking.findMany({
          where: { id: { in: bookingIds } },
          select: { room_unit_id: true },
        })) {
          await tx.roomUnit.updateMany({
            where: { id: booking.room_unit_id, status: "RESERVED" },
            data: { status: "AVAILABLE" },
          });
        }
      }

      // Notifikasi ke user
      await tx.notification.create({
        data: {
          user_id: userId,
          type: "BOOKING_EXPIRED",
          message: `Akun Anda telah diblokir. Alasan: ${parsed.data.reason}`,
        },
      });
    });

    return apiResponse.success({ user_id: userId, blocked: true }, "User berhasil diblokir.");
  } catch (error) {
    return handleError(error);
  }
}

/**
 * DELETE /api/admin/users/:id/block — buka blokir user
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session) throw new UnauthorizedError("Belum login");
    if ((session.user as { role: string }).role !== "ADMIN") {
      throw new ForbiddenError("Hanya admin");
    }

    const { id: userId } = await params;

    await prisma.user.update({
      where: { id: userId },
      data: { is_blocked: false, blocked_reason: null, blocked_at: null },
    });

    return apiResponse.success({ user_id: userId, blocked: false }, "User berhasil dibuka blokirnya.");
  } catch (error) {
    return handleError(error);
  }
}
