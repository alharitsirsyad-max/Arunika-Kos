import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors/AppError";

/**
 * POST /api/admin/bookings/check-expired
 * Cek booking ACTIVE yang sudah melewati durasi sewa.
 * Untuk setiap booking yang expired:
 *   - Buat Invoice EXTENSION baru (tagihan perpanjangan) jika belum ada
 *   - Status booking tetap ACTIVE sampai user memilih perpanjang atau tidak
 *
 * Endpoint ini dipanggil manual oleh admin atau bisa dijadwalkan.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) throw new UnauthorizedError("Belum login");
    if ((session.user as { role: string }).role !== "ADMIN") {
      throw new ForbiddenError("Hanya admin yang dapat menjalankan pengecekan ini");
    }

    const now = new Date();

    // Ambil semua booking ACTIVE
    const activeBookings = await prisma.booking.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        start_date: true,
        duration_periods: true,
        total_price: true,
        room_unit: {
          select: { room: { select: { price: true, period_months: true } } },
        },
        invoices: {
          select: { id: true, type: true, status: true },
        },
      },
    });

    let renewalCreated = 0;
    const results: string[] = [];

    for (const booking of activeBookings) {
      // Hitung tanggal berakhir: start_date + (duration_periods * period_months)
      const periodMonths = booking.room_unit.room.period_months;
      const endDate = new Date(booking.start_date);
      endDate.setMonth(endDate.getMonth() + booking.duration_periods * periodMonths);

      // Cek apakah sudah melewati tanggal berakhir
      if (now < endDate) continue;

      // Cek apakah sudah ada invoice yang UNPAID (sudah menunggu bayar)
      const hasPendingInvoice = booking.invoices.some(
        (inv: { status: string }) => inv.status === "UNPAID"
      );
      if (hasPendingInvoice) continue;

      // Buat invoice perpanjangan bulanan
      const monthlyPrice = booking.room_unit.room.price;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      await prisma.invoice.create({
        data: {
          booking_id: booking.id,
          type: "EXTENSION",
          extra_duration_months: 1,
          amount: monthlyPrice,
          due_date: dueDate,
          status: "UNPAID",
        },
      });

      renewalCreated++;
      results.push(`Booking ${booking.id}: invoice perpanjangan dibuat`);
    }

    return apiResponse.success(
      { checked: activeBookings.length, renewal_invoices_created: renewalCreated, details: results },
      `Pengecekan selesai. ${renewalCreated} invoice perpanjangan dibuat.`
    );
  } catch (error) {
    return handleError(error);
  }
}
