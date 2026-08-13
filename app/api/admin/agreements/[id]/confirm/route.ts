import { NextRequest } from "next/server";
import { subDays } from "date-fns";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors/AppError";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/agreements/:id/confirm
 * Admin mengonfirmasi Agreement dari DRAFT menjadi CONFIRMED.
 *
 * Dalam satu transaksi:
 * 1. Update Agreement ke CONFIRMED, catat confirmed_by dan confirmed_at
 * 2. Buat Invoice PELUNASAN jika belum ada
 *    - amount = agreed_price - dp_amount
 *    - due_date = H-1 sebelum agreed_start_date
 * 3. Kirim Notification AGREEMENT_CONFIRMED ke user pemilik booking
 *
 * Requirements: 3.3, 3.5, 3.7
 */
export async function PATCH(_req: NextRequest, { params }: Params) {
  const { id: agreementId } = await params;

  try {
    const session = await auth();
    if (!session) throw new UnauthorizedError("Belum login");

    const adminUser = session.user as { id: string; role: string };
    if (adminUser.role !== "ADMIN") {
      throw new ForbiddenError("Hanya admin yang dapat mengonfirmasi agreement");
    }

    // Ambil agreement beserta data booking dan invoice terkait
    const agreement = await prisma.agreement.findUnique({
      where: { id: agreementId },
      include: {
        booking: {
          select: {
            id: true,
            user_id: true,
            invoices: {
              select: {
                id: true,
                type: true,
                dp_amount: true,
              },
            },
          },
        },
      },
    });

    if (!agreement) {
      throw new NotFoundError(`Agreement ${agreementId} tidak ditemukan`);
    }

    // Validasi: agreement harus berstatus DRAFT
    if (agreement.status !== "DRAFT") {
      throw new ValidationError(
        "Hanya agreement berstatus DRAFT yang dapat dikonfirmasi",
        "NOT_DRAFT"
      );
    }

    const now = new Date();

    const confirmedAgreement = await prisma.$transaction(async (tx) => {
      // 1. Update Agreement ke CONFIRMED
      const updated = await tx.agreement.update({
        where: { id: agreementId },
        data: {
          status: "CONFIRMED",
          confirmed_by: adminUser.id,
          confirmed_at: now,
        },
      });

      // 2. Buat Invoice PELUNASAN jika belum ada
      const existingPelunasan = agreement.booking.invoices.find(
        (inv) => inv.type === "PELUNASAN"
      );

      if (!existingPelunasan) {
        const dpInvoice = agreement.booking.invoices.find(
          (inv) => inv.type === "DP"
        );
        // dp_amount dari invoice DP, fallback ke env variable atau 1.000.000
        const dpAmount =
          dpInvoice?.dp_amount ??
          Number(process.env.DP_AMOUNT ?? 1_000_000);
        const pelunasanAmount = agreement.agreed_price - dpAmount;
        // Due date: H-1 sebelum agreed_start_date
        const dueDate = subDays(new Date(agreement.agreed_start_date), 1);

        const startDateFormatted = new Date(
          agreement.agreed_start_date
        ).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });

        await tx.invoice.create({
          data: {
            booking_id: agreement.booking_id,
            type: "PELUNASAN",
            amount: pelunasanAmount,
            due_date: dueDate,
            items: {
              create: [
                {
                  description: `Pelunasan Sewa (${startDateFormatted})`,
                  amount: pelunasanAmount,
                },
              ],
            },
          },
        });
      }

      // 3. Kirim Notification AGREEMENT_CONFIRMED ke user pemilik booking
      const startDateFormatted = new Date(
        agreement.agreed_start_date
      ).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      await tx.notification.create({
        data: {
          user_id: agreement.booking.user_id,
          type: "AGREEMENT_CONFIRMED",
          message: `Kesepakatan sewa Anda telah dikonfirmasi. Tanggal masuk: ${startDateFormatted}, harga disepakati: Rp${agreement.agreed_price.toLocaleString("id-ID")}.`,
          related_booking_id: agreement.booking_id,
        },
      });

      return updated;
    });

    return apiResponse.success(
      {
        id: confirmedAgreement.id,
        status: confirmedAgreement.status,
        confirmed_by: confirmedAgreement.confirmed_by,
        confirmed_at: confirmedAgreement.confirmed_at,
      },
      "Agreement berhasil dikonfirmasi"
    );
  } catch (error) {
    return handleError(error);
  }
}
