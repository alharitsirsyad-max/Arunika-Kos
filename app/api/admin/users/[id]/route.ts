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
      let signedUrl: string = doc.document_url;

      try {
        // Extract publicId dari full URL Cloudinary
        // Contoh URL: https://res.cloudinary.com/demo/image/upload/v123/folder/filename.jpg
        const urlParts = doc.document_url.split("/");
        const publicIdWithExt = urlParts.slice(-2).join("/"); // folder/filename.ext
        const publicId = publicIdWithExt.replace(/\.[^/.]+$/, ""); // hapus extension

        signedUrl = cloudinary.url(publicId, {
          sign_url: true,
          type: "private",
          expires_at: expiresAt,
        });
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
