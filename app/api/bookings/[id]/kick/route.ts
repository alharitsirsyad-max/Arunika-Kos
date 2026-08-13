import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import {
  UnauthorizedError, ForbiddenError, NotFoundError, ConflictError,
} from "@/lib/errors/AppError";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/bookings/:id/kick
 * Admin kick user dari booking ACTIVE (user keluar mendadak).
 * - Booking → DONE
 * - Unit → AVAILABLE
 * - Invoice UNPAID dihapus (jika ada)
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id: bookingId } = await params;

  try {
    const session = await auth();
    if (!session) throw new UnauthorizedError("Belum login");
    if ((session.user as { role: string }).role !== "ADMIN") {
      throw new ForbiddenError("Hanya admin yang dapat melakukan kick");
    }

    const body = await req.json().catch(() => ({}));
    const adminNote: string = body?.admin_note?.trim() || "Sewa diakhiri oleh admin.";

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        invoices: { include: { payment: true } },
        room_unit: true,
      },
    });

    if (!booking) throw new NotFoundError(`Booking ${bookingId} tidak ditemukan`);

    // Bisa kick booking ACTIVE atau APPROVED
    if (!["ACTIVE", "APPROVED"].includes(booking.status)) {
      throw new ConflictError(
        `Booking tidak dapat di-kick karena statusnya ${booking.status}. Hanya ACTIVE atau APPROVED.`,
        "INVALID_BOOKING_STATUS"
      );
    }

    await prisma.$transaction(async (tx) => {
      // 1. Hapus payment dan invoice UNPAID
      for (const inv of booking.invoices) {
        if (inv.status === "UNPAID") {
          if (inv.payment) {
            await tx.payment.delete({ where: { id: inv.payment.id } });
          }
          await tx.invoice.delete({ where: { id: inv.id } });
        }
      }

      // 2. Update booking → DONE
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: "DONE", admin_note: adminNote },
      });

      // 3. Bebaskan unit
      await tx.roomUnit.update({
        where: { id: booking.room_unit_id },
        data: { status: "AVAILABLE" },
      });
    });

    return apiResponse.success(
      { booking_id: bookingId, status: "DONE" },
      "User berhasil di-kick. Unit kamar telah dibebaskan."
    );
  } catch (error) {
    console.error("[KICK_BOOKING]", error);
    return handleError(error);
  }
}
