import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { userRepo } from "@/lib/repositories/user.repo";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/errors/AppError";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/users/:id — detail user beserta dokumen dan kontak darurat (admin only)
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id: userId } = await params;

  try {
    const session = await auth();
    if (!session) throw new UnauthorizedError("Belum login");
    if ((session.user as { role: string }).role !== "ADMIN") {
      throw new ForbiddenError("Hanya admin yang dapat mengakses data pengguna", "FORBIDDEN");
    }

    const user = await userRepo.findByIdWithDetails(userId);
    if (!user) throw new NotFoundError(`User ${userId} tidak ditemukan`);

    return apiResponse.success(user, "Berhasil mengambil data pengguna");
  } catch (error) {
    return handleError(error);
  }
}
