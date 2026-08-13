import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors/AppError";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/invoices/:id/waive-late-fee
 * Admin men-toggle pengecualian denda keterlambatan pada sebuah invoice.
 *
 * Request body: `{ "waive": boolean }`
 * - true  → set is_late_fee_waived = true (kecualikan denda)
 * - false → set is_late_fee_waived = false (batalkan pengecualian)
 *
 * Validasi:
 * - Invoice tidak boleh sudah berstatus PAID (400 INVOICE_ALREADY_PAID)
 * - User harus ADMIN
 *
 * Requirements: 5.5, 5.6
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id: invoiceId } = await params;

  try {
    const session = await auth();
    if (!session) throw new UnauthorizedError("Belum login");
    if ((session.user as { role: string }).role !== "ADMIN") {
      throw new ForbiddenError(
        "Hanya admin yang dapat mengubah status pengecualian denda",
        "FORBIDDEN"
      );
    }

    // Parse request body
    const body = await req.json();
    const { waive } = body as { waive: boolean };

    if (typeof waive !== "boolean") {
      throw new ValidationError(
        'Field "waive" wajib ada dan bertipe boolean',
        "VALIDATION_ERROR"
      );
    }

    // Fetch invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, status: true, is_late_fee_waived: true },
    });

    if (!invoice) {
      throw new NotFoundError(`Invoice ${invoiceId} tidak ditemukan`);
    }

    // Req 5.5: tidak bisa waive invoice yang sudah PAID
    if (invoice.status === "PAID") {
      throw new ValidationError(
        "Tidak dapat mengubah status pengecualian denda pada invoice yang sudah lunas",
        "INVOICE_ALREADY_PAID"
      );
    }

    // Update is_late_fee_waived
    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        is_late_fee_waived: waive,
      },
      select: {
        id: true,
        is_late_fee_waived: true,
        status: true,
      },
    });

    return apiResponse.success(
      {
        id: updated.id,
        is_late_fee_waived: updated.is_late_fee_waived,
      },
      waive
        ? "Denda keterlambatan berhasil dikecualikan"
        : "Pengecualian denda berhasil dibatalkan"
    );
  } catch (error) {
    return handleError(error);
  }
}
