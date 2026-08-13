import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { userService } from "@/lib/services/user.service";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors/AppError";

/**
 * GET /api/users — daftar semua pengguna (admin only)
 *
 * 1. Cek session → UnauthorizedError (401) jika belum login.
 * 2. Cek role ADMIN → ForbiddenError (403) + log [SECURITY] jika bukan ADMIN.
 *    Log mencakup: timestamp, userId, IP, endpoint (Requirements 9.4, 9.5, 14.2).
 * 3. Ambil query param `?search=` (opsional).
 * 4. Panggil userService.getUsers(search).
 * 5. Return apiResponse.success(users, ...).
 *
 * Requirements: 9.4, 9.5, 17.4
 */
export async function GET(req: NextRequest) {
  try {
    // Step 1: Cek session
    const session = await auth();
    if (!session) {
      throw new UnauthorizedError("Belum login");
    }

    const userId = session.user!.id!;
    const role = (session.user as { role: string }).role;

    // Step 2: Cek role ADMIN — log [SECURITY] jika bukan ADMIN (Req 9.4, 9.5, 14.2)
    if (role !== "ADMIN") {
      const ip =
        req.headers.get("x-forwarded-for") ??
        req.headers.get("x-real-ip") ??
        "unknown";

      console.warn(
        `[SECURITY] ${new Date().toISOString()} | Non-admin tried GET /api/users | userId=${userId} | ip=${ip}`
      );

      throw new ForbiddenError("Hanya admin yang dapat mengakses daftar pengguna");
    }

    // Step 3: Ambil query param ?search=
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? undefined;

    // Step 4: Panggil service
    const users = await userService.getUsers(search);

    // Step 5: Return response sukses
    return apiResponse.success(users, "Berhasil mengambil data pengguna");
  } catch (error) {
    return handleError(error);
  }
}
