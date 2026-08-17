import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import { UnauthorizedError } from "@/lib/errors/AppError";

/**
 * DELETE /api/users/me — user hapus akun sendiri secara permanen
 * Menghapus semua data terkait user tanpa terkecuali.
 */
export async function DELETE() {
  try {
    const session = await auth();
    if (!session) throw new UnauthorizedError("Belum login");

    const userId = session.user!.id!;

    // Hapus semua data terkait dalam urutan yang benar (FK constraint)
    await prisma.$transaction(async (tx) => {
      // Hapus payment → invoice → booking terkait
      const bookings = await tx.booking.findMany({
        where: { user_id: userId },
        select: { id: true },
      });
      const bookingIds = bookings.map((b) => b.id);

      if (bookingIds.length > 0) {
        const invoices = await tx.invoice.findMany({
          where: { booking_id: { in: bookingIds } },
          select: { id: true },
        });
        const invoiceIds = invoices.map((i) => i.id);

        if (invoiceIds.length > 0) {
          await tx.payment.deleteMany({ where: { invoice_id: { in: invoiceIds } } });
          await tx.invoiceItem.deleteMany({ where: { invoice_id: { in: invoiceIds } } });
          await tx.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
        }

        await tx.agreement.deleteMany({ where: { booking_id: { in: bookingIds } } });
        await tx.review.deleteMany({ where: { booking_id: { in: bookingIds } } });
        await tx.booking.deleteMany({ where: { user_id: userId } });
      }

      await tx.identityDocument.deleteMany({ where: { user_id: userId } });
      await tx.emergencyContact.deleteMany({ where: { user_id: userId } });
      await tx.notification.deleteMany({ where: { user_id: userId } });
      await tx.report.deleteMany({ where: { user_id: userId } });
      await tx.otpCode.deleteMany({ where: { email: session.user!.email! } });

      // Hapus user terakhir
      await tx.user.delete({ where: { id: userId } });
    });

    return apiResponse.success(null, "Akun berhasil dihapus secara permanen.");
  } catch (error) {
    return handleError(error);
  }
}
