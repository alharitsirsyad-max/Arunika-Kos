import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBookingSchema } from "@/lib/validations/booking";
import { bookingService } from "@/lib/services/booking.service";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import { UnauthorizedError, ValidationError } from "@/lib/errors/AppError";

/**
 * GET /api/bookings — daftar booking
 * - USER: hanya booking milik sendiri
 * - ADMIN: semua booking tanpa filter
 *
 * Requirements: 1.2, 9.2, 9.6, 17.2
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      throw new UnauthorizedError("Belum login");
    }

    const userId = session.user!.id!;
    const role = (session.user as { role: string }).role;

    const bookings = await bookingService.getBookings(userId, role);

    return apiResponse.success(bookings, "Berhasil mengambil data booking");
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/bookings — buat booking baru
 * Validasi input dengan Zod, panggil bookingService.createBooking()
 *
 * Requirements: 1.2, 6.1, 6.2, 17.2
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      throw new UnauthorizedError("Belum login");
    }

    const body = await req.json();
    const parsed = createBookingSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        `Validasi gagal: ${JSON.stringify(parsed.error.flatten())}`
      );
    }

    const userId = session.user!.id!;
    const role = (session.user as { role: string }).role;

    // Cek ketersediaan kontak darurat sebelum booking
    const emergencyContactCount = await prisma.emergencyContact.count({
      where: { user_id: userId },
    });
    if (emergencyContactCount === 0) {
      throw new ValidationError(
        "Anda belum memiliki kontak darurat. Silakan tambahkan kontak darurat di halaman Identitas sebelum melakukan booking.",
        "NO_EMERGENCY_CONTACT"
      );
    }

    const booking = await bookingService.createBooking(userId, parsed.data, role);

    return apiResponse.created(booking, "Booking berhasil dibuat");
  } catch (error) {
    return handleError(error);
  }
}
