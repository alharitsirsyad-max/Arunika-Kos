import { auth } from "@/lib/auth";
import { invoiceService } from "@/lib/services/invoice.service";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import { UnauthorizedError } from "@/lib/errors/AppError";

/**
 * GET /api/invoices/me — ambil semua invoice milik user yang login
 * Auth: USER (login required)
 *
 * Flow:
 * 1. Auth check → UnauthorizedError (401)
 * 2. invoiceService.getMyInvoices(session.user.id)
 * 3. Return apiResponse.success(invoices)
 *
 * Requirements: 3.1–3.5, 17.1–17.4
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      throw new UnauthorizedError("Belum login");
    }

    const userId = session.user!.id!;
    const invoices = await invoiceService.getMyInvoices(userId);

    return apiResponse.success(invoices, "Berhasil mengambil data invoice");
  } catch (error) {
    return handleError(error);
  }
}
