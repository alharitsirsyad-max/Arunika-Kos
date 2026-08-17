import { auth } from "@/lib/auth";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/errors/AppError";
import { userRepo } from "@/lib/repositories/user.repo";
import { cloudinary } from "@/lib/cloudinary";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/users/:id — admin lihat detail user
 *
 * 1. Auth check — UnauthorizedError jika belum login
 * 2. Role check — ForbiddenError jika bukan ADMIN
 * 3. Panggil userRepo.findByIdWithDetails(params.id)
 * 4. Jika tidak ada → NotFoundError
 * 5. Generate signed URL Cloudinary untuk setiap dokumen (berlaku 1 jam)
 * 6. Return detail user dengan signed_url di setiap dokumen
 *
 * Requirements: 2.2, 2.3
 */
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;

  try {
    // 1. Auth check
    const session = await auth();
    if (!session) {
      throw new UnauthorizedError("Belum login");
    }

    // 2. Role check
    const sessionUser = session.user as { id: string; role: string };
    if (sessionUser.role !== "ADMIN") {
      throw new ForbiddenError("Hanya admin yang dapat mengakses detail user");
    }

    // 3. Ambil data user beserta dokumen dan kontak darurat
    const user = await userRepo.findByIdWithDetails(id);

    // 4. Jika tidak ada
    if (!user) {
      throw new NotFoundError(`User dengan id ${id} tidak ditemukan`);
    }

    // 5. Generate signed URL Cloudinary untuk setiap dokumen (berlaku 1 jam)
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;

    const documentsWithSignedUrl = user.ownedDocuments.map((doc) => {
      // Audit log sebelum generate signed URL (Req 7.1, 7.2, 7.3, 7.4)
      // signed_url dan document_url TIDAK dicatat
      console.info(
        "[AUDIT]",
        JSON.stringify({
          adminId: sessionUser.id,
          action: "VIEW_IDENTITY_DOCUMENT",
          documentId: doc.id,
          documentOwnerId: user.id,
          timestamp: new Date().toISOString(),
        }),
      );

      let signedUrl: string = doc.document_url;

      try {
        // Extract publicId dari full URL Cloudinary private
        // Format URL private: https://res.cloudinary.com/{cloud}/image/private/v{ver}/{public_id}.{ext}
        // public_id untuk dokumen identitas: "identity-documents/{filename}" (tanpa ekstensi)
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const uploadTypePattern = cloudName
          ? new RegExp(
              `res\\.cloudinary\\.com/${cloudName}/(?:image|video|raw)/(?:upload|private|authenticated)/(?:v\\d+/)?(.+?)(?:\\.[^./]+)?$`
            )
          : null;

        const match = uploadTypePattern?.exec(doc.document_url);
        const publicId = match?.[1];

        if (publicId) {
          signedUrl = cloudinary.url(publicId, {
            sign_url: true,
            type: "authenticated",
            expires_at: expiresAt,
          });
        }
      } catch {
        // Fallback ke document_url asli jika Cloudinary tidak terkonfigurasi atau gagal
        signedUrl = doc.document_url;
      }

      return {
        ...doc,
        signed_url: signedUrl,
      };
    });

    // 6. Return result dengan signed_url
    const result = {
      ...user,
      ownedDocuments: documentsWithSignedUrl,
    };

    return apiResponse.success(result, "Berhasil mengambil detail user");
  } catch (error) {
    return handleError(error);
  }
}
