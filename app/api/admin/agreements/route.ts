import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import {
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} from "@/lib/errors/AppError";

/**
 * Zod schema untuk validasi request body POST /api/admin/agreements
 */
const createAgreementSchema = z.object({
  booking_id: z.string().min(1, "booking_id tidak boleh kosong"),
  room_unit_id: z.string().min(1, "room_unit_id tidak boleh kosong"),
  agreed_start_date: z
    .string()
    .refine(
      (val) => {
        const date = new Date(val);
        if (isNaN(date.getTime())) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date >= today;
      },
      { message: "agreed_start_date harus tanggal valid dan tidak di masa lalu" }
    ),
  agreed_price: z
    .number({ message: "agreed_price harus berupa angka" })
    .int("agreed_price harus bilangan bulat")
    .min(1, "agreed_price minimal 1"),
});

/**
 * POST /api/admin/agreements
 * Admin membuat Agreement baru dengan status DRAFT untuk Booking yang sudah DP_PAID.
 *
 * Validasi:
 * - Booking harus berstatus DP_PAID (400 BOOKING_NOT_DP_PAID)
 * - Belum ada Agreement untuk booking ini (409 AGREEMENT_EXISTS)
 * - User harus admin (403 FORBIDDEN)
 *
 * Requirements: 3.1, 3.2
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) throw new UnauthorizedError("Belum login");
    if ((session.user as { role: string }).role !== "ADMIN") {
      throw new ForbiddenError("Hanya admin yang dapat membuat agreement");
    }

    const body = await req.json();
    const parsed = createAgreementSchema.safeParse(body);
    if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Input tidak valid";
      throw new ValidationError(message);
    }

    const { booking_id, room_unit_id, agreed_start_date, agreed_price } =
      parsed.data;

    // Validasi: booking harus berstatus DP_PAID
    const booking = await prisma.booking.findUnique({
      where: { id: booking_id },
      select: { id: true, status: true },
    });

    if (!booking || booking.status !== "DP_PAID") {
      throw new ValidationError(
        "Booking harus berstatus DP_PAID sebelum membuat agreement",
        "BOOKING_NOT_DP_PAID"
      );
    }

    // Validasi: belum ada Agreement untuk booking ini
    const existingAgreement = await prisma.agreement.findUnique({
      where: { booking_id },
    });

    if (existingAgreement) {
      throw new ConflictError(
        "Agreement sudah ada untuk booking ini",
        "AGREEMENT_EXISTS"
      );
    }

    // Buat Agreement baru dengan status DRAFT
    const agreement = await prisma.agreement.create({
      data: {
        booking_id,
        room_unit_id,
        agreed_start_date: new Date(agreed_start_date),
        agreed_price,
        status: "DRAFT",
      },
    });

    return apiResponse.created(agreement, "Agreement berhasil dibuat");
  } catch (error) {
    return handleError(error);
  }
}
