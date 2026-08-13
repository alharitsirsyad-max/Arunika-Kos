import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import { calculateLateFee } from "@/lib/utils/late-fee";
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/errors/AppError";

type Params = { params: Promise<{ id: string }> };

/**
 * Upsert item denda pada invoice secara idempotent.
 * - Jika daysOverdue >= 1 dan tidak waived dan belum PAID: buat/update item denda
 * - Jika denda tidak berlaku lagi: hapus item denda jika ada
 *
 * Requirements: 5.2, 5.3
 */
async function upsertLateFeeItem(invoiceId: string): Promise<void> {
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { items: true },
  });

  const { daysOverdue, totalLateFee } = calculateLateFee(invoice);

  const existingLateFeeItem = invoice.items.find((item) =>
    item.description.startsWith("Denda keterlambatan")
  );

  if (
    daysOverdue >= 1 &&
    !invoice.is_late_fee_waived &&
    invoice.status !== "PAID"
  ) {
    const description = `Denda keterlambatan ${daysOverdue} hari`;
    if (existingLateFeeItem) {
      await prisma.invoiceItem.update({
        where: { id: existingLateFeeItem.id },
        data: { description, amount: totalLateFee },
      });
    } else {
      await prisma.invoiceItem.create({
        data: { invoice_id: invoiceId, description, amount: totalLateFee },
      });
    }
  } else if (existingLateFeeItem) {
    // Denda tidak berlaku lagi (waived atau sudah dibayar) — hapus item denda
    await prisma.invoiceItem.delete({ where: { id: existingLateFeeItem.id } });
  }
}

/**
 * GET /api/invoices/:id
 * Ambil satu invoice berdasarkan ID.
 * Autentikasi: USER yang memiliki invoice, atau ADMIN.
 *
 * Selain data invoice, response menyertakan:
 * - Kalkulasi denda real-time (late_fee_summary)
 * - Daftar items (invoice_items) termasuk item denda yang di-upsert
 * - receipt_number jika sudah PAID
 *
 * Requirements: 5.2, 5.3, 5.4, 8.1
 */
export async function GET(
  _req: NextRequest,
  { params }: Params
) {
  const { id: invoiceId } = await params;

  try {
    const session = await auth();
    if (!session) throw new UnauthorizedError("Belum login");

    const sessionUser = session.user as { id: string; role: string };

    // Fetch invoice beserta booking dan items
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        items: {
          orderBy: { created_at: "asc" },
        },
        booking: {
          select: {
            id: true,
            user_id: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundError(`Invoice ${invoiceId} tidak ditemukan`);
    }

    // IDOR check: user hanya boleh akses invoice miliknya, admin boleh semua
    if (
      sessionUser.role !== "ADMIN" &&
      invoice.booking.user_id !== sessionUser.id
    ) {
      throw new ForbiddenError(
        "Anda tidak memiliki akses ke invoice ini",
        "FORBIDDEN"
      );
    }

    // Upsert item denda secara idempotent (hanya jika invoice belum PAID)
    // Req 5.3: pastikan tepat satu item denda ada jika berlaku
    if (invoice.status !== "PAID") {
      await upsertLateFeeItem(invoiceId);
    }

    // Re-fetch invoice setelah upsert agar items terbaru
    const updatedInvoice = await prisma.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
      include: {
        items: {
          orderBy: { created_at: "asc" },
        },
        booking: {
          select: {
            id: true,
            user_id: true,
          },
        },
      },
    });

    // Kalkulasi late fee untuk summary
    const { daysOverdue, totalLateFee, isWaived } =
      calculateLateFee(updatedInvoice);

    const response = {
      id: updatedInvoice.id,
      booking_id: updatedInvoice.booking_id,
      type: updatedInvoice.type,
      extra_duration_months: updatedInvoice.extra_duration_months,
      amount: updatedInvoice.amount,
      due_date: updatedInvoice.due_date,
      status: updatedInvoice.status,
      grace_period_days: updatedInvoice.grace_period_days,
      late_fee_per_day: updatedInvoice.late_fee_per_day,
      is_late_fee_waived: updatedInvoice.is_late_fee_waived,
      receipt_number: updatedInvoice.receipt_number,
      dp_amount: updatedInvoice.dp_amount,
      created_at: updatedInvoice.created_at,
      items: updatedInvoice.items.map((item) => ({
        id: item.id,
        description: item.description,
        amount: item.amount,
      })),
      late_fee_summary: {
        days_overdue: daysOverdue,
        total_late_fee: totalLateFee,
        is_waived: isWaived,
      },
    };

    return apiResponse.success(response, "Berhasil mengambil data invoice");
  } catch (error) {
    return handleError(error);
  }
}
