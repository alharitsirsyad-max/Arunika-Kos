import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { verifyIdentityDocumentSchema } from "@/lib/validations/identity";
import { identityService } from "@/lib/services/identity.service";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import {
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
} from "@/lib/errors/AppError";

/**
 * PATCH /api/identity-documents/:id/verify — verifikasi dokumen identitas (admin only)
 * Auth: ADMIN only
 *
 * Flow:
 * 1. Auth check → UnauthorizedError (401)
 * 2. Role check: ADMIN → ForbiddenError (403)
 * 3. Validasi Zod verifyIdentityDocumentSchema
 * 4. identityService.verifyDocument() — audit log ada di dalam service
 * 5. Return apiResponse.success(document)
 *
 * Requirements: 10.3–10.9, 18.2, 17.1–17.4
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
      const ip =
        req.headers.get("x-forwarded-for") ??
        req.headers.get("x-real-ip") ??
        "unknown";
      console.warn(
        `[SECURITY] ${new Date().toISOString()} | Non-admin tried PATCH /api/identity-documents/:id/verify | userId=${userId} | ip=${ip}`
      );
      throw new ForbiddenError(
        "Hanya admin yang dapat memverifikasi dokumen identitas",
        "FORBIDDEN"
      );
    }

    const { id: documentId } = await params;
    const body = await req.json();

    const parsed = verifyIdentityDocumentSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        `Validasi gagal: ${JSON.stringify(parsed.error.flatten())}`
      );
    }

    // Audit log dan update verification status ada di dalam service
    const document = await identityService.verifyDocument(
      documentId,
      parsed.data.verification_status,
      userId
    );

    return apiResponse.success(document, "Status verifikasi dokumen berhasil diperbarui");
  } catch (error) {
    return handleError(error);
  }
}
