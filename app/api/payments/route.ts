import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { paymentService } from "@/lib/services/payment.service";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import { UnauthorizedError, ValidationError } from "@/lib/errors/AppError";

/**
 * POST /api/payments — buat Snap token Midtrans untuk invoice
 *
 * Body: { invoice_id: string }
 * Requirements: 11.1–11.6, 14.3, 17.3
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      throw new UnauthorizedError("Belum login");
    }

    const body = await req.json();
    const { invoice_id } = body;

    if (!invoice_id || typeof invoice_id !== "string") {
      throw new ValidationError("invoice_id wajib diisi");
    }

    const userId = session.user!.id!;
    const result = await paymentService.createSnapToken(userId, invoice_id);

    return apiResponse.success(result, "Token pembayaran berhasil dibuat");
  } catch (error) {
    return handleError(error);
  }
}
