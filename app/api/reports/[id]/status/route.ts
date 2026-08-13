import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { updateReportStatusSchema } from "@/lib/validations/report";
import { reportService } from "@/lib/services/report.service";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import { UnauthorizedError, ForbiddenError, ValidationError } from "@/lib/errors/AppError";
import type { ReportStatus } from "@prisma/client";

/**
 * PATCH /api/reports/:id/status — update status laporan masalah (admin only)
 * Auth: ADMIN only
 *
 * Flow:
 * 1. Auth check → UnauthorizedError (401)
 * 2. Role check: ADMIN → ForbiddenError (403)
 *    Log akses non-admin ke security log (Requirement 18.3)
 * 3. Validasi Zod updateReportStatusSchema
 * 4. reportService.updateReportStatus(id, status, adminNote)
 * 5. Return apiResponse.success(report)
 *
 * Requirements: 7.3–7.8, 18.3, 17.1–17.4
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      throw new UnauthorizedError("Belum login");
    }

    const userId = session.user!.id!;
    const role = (session.user as { role: string }).role;

    if (role !== "ADMIN") {
      // Log akses non-admin ke endpoint admin (Requirement 18.3)
      const ip =
        req.headers.get("x-forwarded-for") ??
        req.headers.get("x-real-ip") ??
        "unknown";
      console.warn(
        `[SECURITY] ${new Date().toISOString()} | Non-admin tried PATCH /api/reports/:id/status | userId=${userId} | ip=${ip}`
      );
      throw new ForbiddenError(
        "Hanya admin yang dapat mengubah status laporan",
        "FORBIDDEN"
      );
    }

    const { id: reportId } = await params;
    const body = await req.json();

    const parsed = updateReportStatusSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        `Validasi gagal: ${JSON.stringify(parsed.error.flatten())}`
      );
    }

    const report = await reportService.updateReportStatus(
      reportId,
      parsed.data.status as ReportStatus,
      parsed.data.admin_note
    );

    return apiResponse.success(report, "Status laporan berhasil diperbarui");
  } catch (error) {
    return handleError(error);
  }
}
