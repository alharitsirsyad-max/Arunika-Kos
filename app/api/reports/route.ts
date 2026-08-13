import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { reportService } from "@/lib/services/report.service";
import { createReportSchema } from "@/lib/validations/report";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import { UnauthorizedError, ForbiddenError, ValidationError } from "@/lib/errors/AppError";

/**
 * POST /api/reports — kirim laporan masalah (user)
 * Auth: USER (login required)
 *
 * Flow:
 * 1. Auth check → UnauthorizedError (401)
 * 2. Validasi Zod createReportSchema
 * 3. reportService.createReport(userId, body)
 * 4. Return apiResponse.created(report)
 *
 * Requirements: 6.1–6.9, 17.1–17.4
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      throw new UnauthorizedError("Belum login");
    }

    const body = await req.json();
    const parsed = createReportSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        `Validasi gagal: ${JSON.stringify(parsed.error.flatten())}`
      );
    }

    const userId = session.user!.id!;
    const report = await reportService.createReport(userId, parsed.data);

    return apiResponse.created(report, "Laporan berhasil dikirim");
  } catch (error) {
    return handleError(error);
  }
}

/**
 * GET /api/reports — daftar laporan masalah (admin) atau laporan pendapatan (admin)
 * Menggunakan query param ?type=revenue untuk laporan pendapatan (backward compat).
 * Default: daftar issue reports.
 * Auth: ADMIN only
 *
 * Requirements: 7.1–7.2, 22.1–22.4, 17.1–17.4
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      throw new UnauthorizedError("Belum login");
    }

    const userId = session.user!.id!;
    const role = (session.user as { role: string }).role;

    if (role !== "ADMIN") {
      const ip =
        req.headers.get("x-forwarded-for") ??
        req.headers.get("x-real-ip") ??
        "unknown";

      console.warn(
        `[SECURITY] ${new Date().toISOString()} | Non-admin tried GET /api/reports | userId=${userId} | ip=${ip}`
      );

      throw new ForbiddenError("Hanya admin yang dapat mengakses laporan");
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    // Backward compatibility: ?type=revenue → revenue report
    if (type === "revenue") {
      const startDate = searchParams.get("startDate") ?? undefined;
      const endDate = searchParams.get("endDate") ?? undefined;
      const report = await reportService.getRevenueReport(startDate, endDate);
      return apiResponse.success(report, "Berhasil mengambil laporan pendapatan");
    }

    // Default: issue reports
    const reports = await reportService.getAllReports();
    return apiResponse.success(reports, "Berhasil mengambil daftar laporan masalah");
  } catch (error) {
    return handleError(error);
  }
}
