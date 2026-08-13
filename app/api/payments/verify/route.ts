import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { coreApi } from "@/lib/midtrans";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import { UnauthorizedError, NotFoundError } from "@/lib/errors/AppError";

/**
 * POST /api/payments/verify
 * Verifikasi status pembayaran langsung ke Midtrans API.
 * Digunakan saat webhook tidak dapat menjangkau localhost (development).
 *
 * Flow:
 * 1. Ambil payment record berdasarkan invoice_id
 * 2. Query status ke Midtrans menggunakan order_id
 * 3. Jika transaction_status === 'settlement', update invoice → PAID
 *    dan booking → ACTIVE (untuk INITIAL) / biarkan (untuk EXTENSION)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) throw new UnauthorizedError("Belum login");

    const { invoice_id } = await req.json();
    if (!invoice_id) {
      return apiResponse.error("invoice_id wajib diisi", 400, "MISSING_INVOICE_ID");
    }

    // Ambil invoice + payment
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoice_id },
      include: {
        payment: true,
        booking: {
          select: {
            id: true,
            user_id: true,
            status: true,
            room_unit_id: true,
          },
        },
      },
    });

    if (!invoice) throw new NotFoundError(`Invoice ${invoice_id} tidak ditemukan`);

    // Verifikasi kepemilikan
    if (invoice.booking.user_id !== session.user!.id) {
      throw new NotFoundError(`Invoice ${invoice_id} tidak ditemukan`);
    }

    if (!invoice.payment) {
      return apiResponse.error("Belum ada data pembayaran untuk invoice ini", 400, "NO_PAYMENT");
    }

    if (invoice.status === "PAID") {
      return apiResponse.success({ status: "PAID", already_paid: true }, "Invoice sudah lunas");
    }

    // Query status ke Midtrans
    let transactionStatus: string;
    try {
      const statusResponse = await coreApi.transaction.status(invoice.payment.midtrans_order_id) as { transaction_status: string };
      transactionStatus = statusResponse.transaction_status;
    } catch (e) {
      console.error("[VERIFY_PAYMENT] Gagal query Midtrans:", e);
      return apiResponse.error("Gagal verifikasi ke Midtrans", 502, "MIDTRANS_ERROR");
    }

    if (transactionStatus !== "settlement" && transactionStatus !== "capture") {
      return apiResponse.success(
        { status: invoice.status, transaction_status: transactionStatus },
        `Pembayaran belum settlement (status: ${transactionStatus})`
      );
    }

    // Update database dalam satu transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update payment → SETTLEMENT
      await tx.payment.update({
        where: { id: invoice.payment!.id },
        data: { status: "SETTLEMENT", paid_at: new Date() },
      });

      // 2. Update invoice → PAID
      await tx.invoice.update({
        where: { id: invoice_id },
        data: { status: "PAID" },
      });

      // 3. Handle berdasarkan tipe invoice
      if (invoice.type === "DP" && invoice.booking.status === "DP_PENDING") {
        // DP paid → Booking DP_PENDING → DP_PAID, Room → RESERVED
        await tx.booking.update({
          where: { id: invoice.booking.id },
          data: { status: "DP_PAID" },
        });

        await tx.roomUnit.update({
          where: { id: invoice.booking.room_unit_id },
          data: { status: "RESERVED" },
        });

        // Expire semua booking PENDING/DP_PENDING lain untuk unit yang sama
        const otherBookings = await tx.booking.findMany({
          where: {
            room_unit_id: invoice.booking.room_unit_id,
            id: { not: invoice.booking.id },
            status: { in: ["PENDING", "DP_PENDING"] },
          },
          select: { id: true, user_id: true },
        });

        if (otherBookings.length > 0) {
          await tx.booking.updateMany({
            where: { id: { in: otherBookings.map((b) => b.id) } },
            data: { status: "EXPIRED" },
          });
          await tx.notification.createMany({
            data: otherBookings.map((b) => ({
              user_id: b.user_id,
              type: "BOOKING_EXPIRED" as const,
              message: "Kamar yang Anda pesan telah diambil oleh penyewa lain yang lebih cepat membayar DP.",
              related_booking_id: b.id,
            })),
          });
        }
      } else if (invoice.type === "INITIAL" && invoice.booking.status === "APPROVED") {
        // Legacy INITIAL → ACTIVE
        await tx.booking.update({
          where: { id: invoice.booking.id },
          data: { status: "ACTIVE" },
        });
      }
      // PELUNASAN dan EXTENSION: hanya update invoice PAID, tidak ada perubahan booking
    });

    return apiResponse.success(
      { status: "PAID", transaction_status: transactionStatus },
      "Pembayaran berhasil diverifikasi dan status diperbarui"
    );
  } catch (error) {
    console.error("[VERIFY_PAYMENT]", error);
    return handleError(error);
  }
}
