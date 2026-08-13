import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors/AppError";
import { handleError } from "@/lib/errors/handleError";
import { invoiceService } from "@/lib/services/invoice.service";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/invoices/:id/receipt — user unduh kwitansi PDF
 *
 * 1. Auth check — lempar UnauthorizedError jika belum login
 * 2. Ambil userId dari session
 * 3. Panggil invoiceService.generateUserReceipt(userId, params.id)
 * 4. Return Response dengan Content-Type: application/pdf
 *    dan header Content-Disposition: attachment; filename="kwitansi.pdf"
 * 5. handleError(error) jika ada exception
 *
 * Requirements: 9.2, 9.4, 9.5, 9.6
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id: invoiceId } = await params;

  try {
    const session = await auth();
    if (!session) {
      throw new UnauthorizedError("Belum login");
    }

    const userId = session.user!.id!;

    const buffer = await invoiceService.generateUserReceipt(userId, invoiceId);

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="kwitansi.pdf"',
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
