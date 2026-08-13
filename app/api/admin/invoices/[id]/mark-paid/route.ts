import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import { invoiceService } from "@/lib/services/invoice.service";
import {
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/errors/AppError";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/invoices/:id/mark-paid
 * Admin menandai invoice sebagai PAID secara manual.
 * Berguna untuk pembayaran tunai / transfer bank offline.
 *
 * Jika type === "DP":
 *   - Generate receipt_number
 *   - Update Invoice DP → PAID
 *   - Update Booking DP_PENDING → DP_PAID
 *   - Update Room_Unit status → RESERVED
 *   - Expire semua Booking PENDING/DP_PENDING lain untuk unit yang sama
 *   - Buat Notification BOOKING_EXPIRED untuk setiap user yang terdampak
 *   - Idempotent: jika Invoice sudah PAID, return ConflictError
 *
 * Requirements: 4.1, 4.2, 4.6
 */
export async function PATCH(_req: NextRequest, { params }: Params) {
  const { id: invoiceId } = await params;

  try {
    const session = await auth();
    if (!session) throw new UnauthorizedError("Belum login");
    if ((session.user as { role: string }).role !== "ADMIN") {
      throw new ForbiddenError("Hanya admin yang dapat menandai invoice sebagai lunas");
    }

    const result = await invoiceService.markInvoicePaid(invoiceId);

    const message =
      result.status === "PAID"
        ? "Invoice berhasil ditandai sebagai Lunas"
        : "Invoice berhasil diperbarui";

    return apiResponse.success(result, message);
  } catch (error) {
    return handleError(error);
  }
}
