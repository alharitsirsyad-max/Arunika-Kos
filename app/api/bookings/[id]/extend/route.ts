import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import { UnauthorizedError, ValidationError, ForbiddenError, NotFoundError } from "@/lib/errors/AppError";

const schema = z.object({
  extra_months: z.number().int().min(1).max(24),
});

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/bookings/:id/extend — user ajukan perpanjangan sewa
 * Membuat ExtensionRequest, tidak langsung ubah durasi.
 * Admin harus setujui dulu.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session) throw new UnauthorizedError("Belum login");

    const { id: bookingId } = await params;
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("extra_months harus angka 1-24");
    }

    const userId = session.user!.id!;

    // Verifikasi booking milik user dan statusnya ACTIVE
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, user_id: true, status: true },
    });

    if (!booking) throw new NotFoundError("Booking tidak ditemukan");
    if (booking.user_id !== userId) throw new ForbiddenError("Akses ditolak");
    if (booking.status !== "ACTIVE") {
      throw new ValidationError("Perpanjangan hanya bisa diajukan untuk booking yang aktif");
    }

    // Cek tidak ada request PENDING yang belum diproses
    const existingPending = await prisma.extensionRequest.findFirst({
      where: { booking_id: bookingId, status: "PENDING" },
    });
    if (existingPending) {
      throw new ValidationError(
        "Sudah ada permintaan perpanjangan yang menunggu persetujuan admin",
        "EXTENSION_PENDING_EXISTS"
      );
    }

    const request = await prisma.extensionRequest.create({
      data: {
        booking_id: bookingId,
        extra_months: parsed.data.extra_months,
        status: "PENDING",
      },
    });

    // Notifikasi ke semua admin — ada permintaan perpanjangan baru
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          user_id: admin.id,
          type: "BOOKING_PENDING" as const,
          message: `Permintaan perpanjangan sewa sebesar ${parsed.data.extra_months} bulan menunggu persetujuan Anda.`,
          related_booking_id: bookingId,
        })),
      });
    }

    return apiResponse.created(request, "Permintaan perpanjangan berhasil diajukan. Menunggu persetujuan admin.");
  } catch (error) {
    return handleError(error);
  }
}
