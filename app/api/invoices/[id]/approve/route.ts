import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { invoiceService } from "@/lib/services/invoice.service";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors/AppError";

/**
 * PATCH /api/invoices/:id/approve — setujui perpanjangan sewa (admin only)
 * Auth: ADMIN only
 *
 * Flow:
 * 1. Auth check → UnauthorizedError (401)
 * 2. Role check: ADMIN → ForbiddenError (403) jika bukan
 * 3. invoiceService.approveExtension(params.id)
 * 4. Return apiResponse.success(updatedBooking)
 *
 * Requirements: 4.1–4.7, 17.1–17.4
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      throw new UnauthorizedError("Belum login");
    }

    const role = (session.user as { role: string }).role;
    if (role !== "ADMIN") {
      throw new ForbiddenError(
        "Hanya admin yang dapat menyetujui perpanjangan sewa",
        "FORBIDDEN"
      );
    }

    const { id: invoiceId } = await params;
    const result = await invoiceService.approveExtension(invoiceId);

    return apiResponse.success(result, "Perpanjangan sewa berhasil disetujui");
  } catch (error) {
    return handleError(error);
  }
}
