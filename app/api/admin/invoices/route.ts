import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors/AppError";
import { calculateLateFee } from "@/lib/utils/late-fee";

/**
 * GET /api/admin/invoices
 * Admin melihat semua invoice dari semua user beserta status pembayarannya.
 * Termasuk kalkulasi denda real-time (late_fee_summary) per invoice.
 *
 * Requirements: 13.3, 13.5
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session) throw new UnauthorizedError("Belum login");
    if ((session.user as { role: string }).role !== "ADMIN") {
      throw new ForbiddenError("Hanya admin yang dapat melihat semua invoice");
    }

    const invoices = await prisma.invoice.findMany({
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        type: true,
        extra_duration_months: true,
        amount: true,
        due_date: true,
        status: true,
        grace_period_days: true,
        late_fee_per_day: true,
        is_late_fee_waived: true,
        receipt_number: true,
        created_at: true,
        booking: {
          select: {
            id: true,
            status: true,
            user: { select: { id: true, name: true, email: true } },
            room_unit: {
              select: {
                room_number: true,
                room: { select: { name: true } },
              },
            },
          },
        },
        payment: {
          select: {
            id: true,
            status: true,
            paid_at: true,
            payment_method: true,
            amount: true,
          },
        },
      },
    });

    // Hitung late_fee_summary secara real-time untuk setiap invoice
    const invoicesWithLateFee = invoices.map((inv) => {
      const lateFeeResult = calculateLateFee({
        due_date: inv.due_date,
        grace_period_days: inv.grace_period_days,
        late_fee_per_day: inv.late_fee_per_day,
        is_late_fee_waived: inv.is_late_fee_waived,
        status: inv.status,
      });

      return {
        ...inv,
        late_fee_summary: {
          days_overdue: lateFeeResult.daysOverdue,
          total_late_fee: lateFeeResult.totalLateFee,
          is_waived: lateFeeResult.isWaived,
        },
      };
    });

    return apiResponse.success(
      invoicesWithLateFee,
      "Berhasil mengambil semua invoice"
    );
  } catch (error) {
    return handleError(error);
  }
}
