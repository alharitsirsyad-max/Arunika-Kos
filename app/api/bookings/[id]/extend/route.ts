import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { extendBookingSchema } from "@/lib/validations/booking";
import { invoiceService } from "@/lib/services/invoice.service";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import { UnauthorizedError, ValidationError } from "@/lib/errors/AppError";

/**
 * POST /api/bookings/:id/extend — ajukan perpanjangan sewa
 * Auth: USER (login required)
 *
 * Flow:
 * 1. Auth check → UnauthorizedError (401)
 * 2. Validasi Zod extendBookingSchema
 * 3. invoiceService.createExtension() — amount dihitung dari DB, bukan input
 * 4. Return apiResponse.created(invoice)
 *
 * Requirements: 2.1–2.8, 17.1–17.4
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      throw new UnauthorizedError("Belum login");
    }

    const { id: bookingId } = await params;
    const body = await req.json();

    const parsed = extendBookingSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        `Validasi gagal: ${JSON.stringify(parsed.error.flatten())}`
      );
    }

    const userId = session.user!.id!;
    const invoice = await invoiceService.createExtension(
      userId,
      bookingId,
      parsed.data.extra_duration_months
    );

    return apiResponse.created(invoice, "Pengajuan perpanjangan berhasil dibuat");
  } catch (error) {
    return handleError(error);
  }
}
