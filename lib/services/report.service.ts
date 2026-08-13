import { prisma } from "@/lib/prisma";
import { reportRepo } from "@/lib/repositories/report.repo";
import { AppError, NotFoundError, ValidationError } from "@/lib/errors/AppError";
import type { CreateReportInput } from "@/lib/types/report.types";
import type { ReportStatus } from "@prisma/client";

/**
 * Satu baris di monthly_breakdown laporan pendapatan.
 */
export type MonthlyBreakdown = {
  year: number;
  month: number; // 1–12
  total: number;
};

/**
 * Output dari getRevenueReport.
 */
export type RevenueReport = {
  total_revenue: number;
  monthly_breakdown: MonthlyBreakdown[];
};

/**
 * Validasi format tanggal YYYY-MM-DD.
 * Mengembalikan true jika valid, false jika tidak.
 */
function isValidDateString(value: string): boolean {
  // Pastikan format YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(value);
  // Pastikan tanggal benar-benar valid (misalnya bukan 2024-02-30)
  return !isNaN(date.getTime());
}

/**
 * ReportService — handles both operational revenue reports and issue reports.
 *
 * getRevenueReport: revenue/operational reports (v1 — preserved)
 * createReport / getAllReports / updateReportStatus: issue reports (v2 — new)
 *
 * Requirements: 6.1–6.9, 7.1–7.8, 11.1, 11.4, 22.1–22.4
 */
export const reportService = {
  // ─────────────────────────────────────────────
  // Issue Reports (v2)
  // ─────────────────────────────────────────────

  /**
   * Create a new issue report.
   *
   * - ROOM_ISSUE: room_unit_id is resolved from user's active booking — never from input.
   * - WEBSITE_ISSUE: room_unit_id = null.
   * - Rate limit: max 5 reports per hour per user (DB-based).
   *
   * Requirements: 6.1–6.9, 11.1, 11.4
   */
  async createReport(userId: string, input: CreateReportInput) {
    let roomUnitId: string | null = null;

    if (input.type === "ROOM_ISSUE") {
      // Resolve room_unit_id from active booking — never from client input (Requirement 6.1)
      const activeBooking = await prisma.booking.findFirst({
        where: { user_id: userId, status: "ACTIVE" },
        select: { room_unit_id: true },
      });

      if (!activeBooking) {
        throw new ValidationError(
          "Anda tidak memiliki booking aktif. Laporan masalah kamar hanya dapat dikirim oleh penghuni aktif.",
          "NO_ACTIVE_BOOKING"
        );
      }

      roomUnitId = activeBooking.room_unit_id;
    }
    // WEBSITE_ISSUE: roomUnitId stays null (Requirement 6.2)

    // Rate limiting: max 5 reports per hour (Requirement 6.4, 6.7)
    const recentCount = await reportRepo.countByUserIdInLastHour(userId);
    if (recentCount >= 5) {
      throw new AppError(
        "Terlalu banyak laporan. Maksimal 5 laporan per jam.",
        429,
        "RATE_LIMIT_EXCEEDED"
      );
    }

    return reportRepo.create({
      user_id: userId,
      room_unit_id: roomUnitId,
      type: input.type,
      title: input.title,
      description: input.description,
      image_url: input.image_url,
    });
  },

  /**
   * Get all reports — admin only, no ownership filter.
   *
   * Requirements: 7.1–7.2
   */
  async getAllReports() {
    return reportRepo.findAll();
  },

  /**
   * Update the status of a report (admin only).
   *
   * Requirements: 7.3–7.8
   */
  async updateReportStatus(
    reportId: string,
    status: ReportStatus,
    adminNote?: string
  ) {
    const report = await reportRepo.findById(reportId);
    if (!report) {
      throw new NotFoundError(`Laporan dengan ID ${reportId} tidak ditemukan`);
    }

    return reportRepo.updateStatus(reportId, status, adminNote);
  },

  // ─────────────────────────────────────────────
  // Revenue Reports (v1 — preserved)
  // ─────────────────────────────────────────────

  /**
   * Hitung total pendapatan dari payment berstatus SETTLEMENT,
   * dikelompokkan per bulan.
   *
   * Requirements: 22.1, 22.2, 22.3, 22.4
   */
  async getRevenueReport(
    startDate?: string,
    endDate?: string
  ): Promise<RevenueReport> {
    // Validasi format tanggal jika disertakan (Requirement 22.3)
    if (startDate !== undefined && !isValidDateString(startDate)) {
      throw new ValidationError(
        `Format startDate tidak valid: "${startDate}". Gunakan format YYYY-MM-DD.`
      );
    }
    if (endDate !== undefined && !isValidDateString(endDate)) {
      throw new ValidationError(
        `Format endDate tidak valid: "${endDate}". Gunakan format YYYY-MM-DD.`
      );
    }

    // Bangun filter tanggal pada kolom paid_at
    const paidAtFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) {
      paidAtFilter.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      paidAtFilter.lte = end;
    }

    const payments = await prisma.payment.findMany({
      where: {
        status: "SETTLEMENT",
        paid_at:
          Object.keys(paidAtFilter).length > 0 ? paidAtFilter : undefined,
      },
      select: {
        amount: true,
        paid_at: true,
      },
    });

    const total_revenue = payments.reduce((sum, p) => sum + p.amount, 0);

    const monthMap = new Map<string, MonthlyBreakdown>();
    for (const payment of payments) {
      if (!payment.paid_at) continue;
      const year = payment.paid_at.getFullYear();
      const month = payment.paid_at.getMonth() + 1;
      const key = `${year}-${String(month).padStart(2, "0")}`;
      const existing = monthMap.get(key);
      if (existing) {
        existing.total += payment.amount;
      } else {
        monthMap.set(key, { year, month, total: payment.amount });
      }
    }

    const monthly_breakdown = Array.from(monthMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    return { total_revenue, monthly_breakdown };
  },
};
