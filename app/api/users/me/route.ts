import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import { UnauthorizedError, ValidationError } from "@/lib/errors/AppError";
import { updateProfileSchema } from "@/lib/validations/user";
import { userService } from "@/lib/services/user.service";
import { userRepo } from "@/lib/repositories/user.repo";

/**
 * GET /api/users/me — ambil data user untuk pre-fill form
 *
 * Requirements: 8.1
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      throw new UnauthorizedError("Belum login");
    }

    const userId = session.user!.id!;
    const user = await userRepo.findById(userId);

    return apiResponse.success(user, "Berhasil mengambil profil");
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PATCH /api/users/me — update profil user
 * Memperbarui nama, nomor telepon, dan/atau alamat.
 * Setelah update, verification_status otomatis diubah ke PENDING
 * dan notifikasi re-verifikasi dikirim ke Admin.
 *
 * Requirements: 8.2
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      throw new UnauthorizedError("Belum login");
    }

    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        `Validasi gagal: ${JSON.stringify(parsed.error.flatten())}`
      );
    }

    const userId = session.user!.id!;
    const result = await userService.updateUserProfile(userId, parsed.data);

    return apiResponse.success(result, "Profil berhasil diperbarui");
  } catch (error) {
    return handleError(error);
  }
}
