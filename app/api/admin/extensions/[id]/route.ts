import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import {
  UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, ValidationError,
} from "@/lib/errors/AppError";

const schema = z.object({
  action: z.enum(["APPROVED", "REJECTED"]),
  admin_note: z.string().optional(),
});

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/extensions/:id — setujui atau tolak permintaan perpanjangan
 * Jika APPROVED: tambah duration_periods booking sesuai extra_months
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session) throw new UnauthorizedError("Belum login");
    if ((session.user as { role: string }).role !== "ADMIN") {
      throw new ForbiddenError("Hanya admin");
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new ValidationError("action harus APPROVED atau REJECTED");

    const adminId = session.user!.id!;
    const { action, admin_note } = parsed.data;

    const request = await prisma.extensionRequest.findUnique({
      where: { id },
      include: { booking: { select: { id: true, duration_periods: true, room_unit: { select: { room: { select: { period_months: true } } } } } } },
    });

    if (!request) throw new NotFoundError("Permintaan perpanjangan tidak ditemukan");
    if (request.status !== "PENDING") {
      throw new ConflictError("Permintaan ini sudah diproses", "ALREADY_PROCESSED");
    }

    await prisma.$transaction(async (tx) => {
      // Update request status
      await tx.extensionRequest.update({
        where: { id },
        data: {
          status: action,
          admin_note: admin_note ?? null,
          reviewed_by: adminId,
          reviewed_at: new Date(),
        },
      });

      if (action === "APPROVED") {
        // Tambah duration_periods booking
        await tx.booking.update({
          where: { id: request.booking_id },
          data: {
            duration_periods: {
              increment: request.extra_months,
            },
          },
        });

        // Notifikasi ke user
        const booking = await tx.booking.findUnique({
          where: { id: request.booking_id },
          select: { user_id: true },
        });
        if (booking) {
          await tx.notification.create({
            data: {
              user_id: booking.user_id,
              type: "EXTENSION_APPROVED",
              message: `Permintaan perpanjangan sewa Anda sebesar ${request.extra_months} bulan telah disetujui oleh admin.`,
              related_booking_id: request.booking_id,
            },
          });
        }
      } else {
        // REJECTED — notifikasi ke user
        const booking = await tx.booking.findUnique({
          where: { id: request.booking_id },
          select: { user_id: true },
        });
        if (booking) {
          await tx.notification.create({
            data: {
              user_id: booking.user_id,
              type: "EXTENSION_REJECTED",
              message: `Permintaan perpanjangan sewa Anda sebesar ${request.extra_months} bulan ditolak oleh admin.${admin_note ? ` Alasan: ${admin_note}` : ''}`,
              related_booking_id: request.booking_id,
            },
          });
        }
      }
    });

    return apiResponse.success(
      { id, status: action },
      action === "APPROVED" ? "Perpanjangan disetujui dan durasi booking diperbarui." : "Permintaan perpanjangan ditolak."
    );
  } catch (error) {
    return handleError(error);
  }
}
