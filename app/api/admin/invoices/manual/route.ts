import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors/AppError";

const manualInvoiceSchema = z.object({
  booking_id: z.string().min(1, "booking_id wajib diisi"),
  type: z.enum(["INITIAL", "EXTENSION"]),
  amount: z.number().int().min(1000, "Jumlah minimal Rp 1.000"),
  extra_duration_months: z.number().int().min(1).optional().nullable(),
  due_date_days: z.number().int().min(1).max(365).default(7),
  mark_as_paid: z.boolean().default(false),
});

/**
 * POST /api/admin/invoices/manual
 * Admin membuat invoice manual untuk booking tertentu.
 * Berguna untuk:
 * - Booking offline yang tidak melalui sistem
 * - Koreksi tagihan
 * - Invoice bulanan yang di-generate manual
 *
 * Jika mark_as_paid = true, invoice langsung ditandai PAID
 * dan booking diupdate ke ACTIVE (jika INITIAL dan masih APPROVED)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) throw new UnauthorizedError("Belum login");
    if ((session.user as { role: string }).role !== "ADMIN") {
      throw new ForbiddenError("Hanya admin yang dapat membuat invoice manual");
    }

    const body = await req.json();
    const parsed = manualInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        "Validasi gagal: " + JSON.stringify(parsed.error.flatten().fieldErrors)
      );
    }

    const { booking_id, type, amount, extra_duration_months, due_date_days, mark_as_paid } =
      parsed.data;

    // Verifikasi booking ada
    const booking = await prisma.booking.findUnique({
      where: { id: booking_id },
      select: {
        id: true,
        status: true,
        user: { select: { name: true } },
        room_unit: { select: { room: { select: { name: true } } } },
      },
    });

    if (!booking) throw new NotFoundError(`Booking ${booking_id} tidak ditemukan`);

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + due_date_days);

    const invoice = await prisma.$transaction(async (tx) => {
      const newInvoice = await tx.invoice.create({
        data: {
          booking_id,
          type,
          extra_duration_months: type === "EXTENSION" ? (extra_duration_months ?? 1) : null,
          amount,
          due_date: dueDate,
          status: mark_as_paid ? "PAID" : "UNPAID",
        },
      });

      // Jika langsung lunas dan INITIAL → booking ACTIVE
      if (mark_as_paid && type === "INITIAL" && booking.status === "APPROVED") {
        await tx.booking.update({
          where: { id: booking_id },
          data: { status: "ACTIVE" },
        });
      }

      return newInvoice;
    });

    return apiResponse.created(
      { ...invoice, booking_user: booking.user.name, room: booking.room_unit.room.name },
      `Invoice manual berhasil dibuat${mark_as_paid ? " dan ditandai sebagai Lunas" : ""}`
    );
  } catch (error) {
    return handleError(error);
  }
}
