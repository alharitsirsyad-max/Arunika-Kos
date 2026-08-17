import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import { UnauthorizedError, ValidationError } from "@/lib/errors/AppError";
import { cancelBookingSchema } from "@/lib/validations/booking";
import { bookingService } from "@/lib/services/booking.service";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/bookings/:id/cancel — user membatalkan booking milik sendiri
 *
 * Requirements: 5.3, 5.5, 5.6
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session) {
      throw new UnauthorizedError("Belum login");
    }

    const body = await req.json();
    const parsed = cancelBookingSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        `Validasi gagal: ${JSON.stringify(parsed.error.flatten())}`
      );
    }

    const userId = session.user!.id!;
    const role = (session.user as { role?: string })?.role ?? 'USER';
    const { id } = await params;

    const result = await bookingService.cancelBooking(
      userId,
      id,
      parsed.data.cancellationMessage,
      role
    );

    return apiResponse.success(result, "Booking berhasil dibatalkan");
  } catch (error) {
    return handleError(error);
  }
}
