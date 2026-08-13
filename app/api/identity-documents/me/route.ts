import { auth } from "@/lib/auth";
import { identityService } from "@/lib/services/identity.service";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import { UnauthorizedError } from "@/lib/errors/AppError";

/**
 * GET /api/identity-documents/me — dokumen identitas milik user yang login
 * Auth: USER (login required)
 *
 * Flow:
 * 1. Auth check → UnauthorizedError (401)
 * 2. identityService.getMyDocuments(session.user.id)
 *    → filter ketat WHERE user_id = session.user.id
 *    → TIDAK mengembalikan document_url (Requirement 9.4)
 * 3. Return apiResponse.success(documents)
 *
 * NOTE: Path statis /me harus didefinisikan di file terpisah dari [id]/route.ts
 * agar tidak bentrok dengan route dinamis.
 *
 * Requirements: 9.1–9.5, 17.1–17.4
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      throw new UnauthorizedError("Belum login");
    }

    const userId = session.user!.id!;
    const documents = await identityService.getMyDocuments(userId);

    return apiResponse.success(documents, "Berhasil mengambil dokumen identitas");
  } catch (error) {
    return handleError(error);
  }
}
