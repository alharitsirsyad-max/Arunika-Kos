import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cloudinary } from "@/lib/cloudinary";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import { UnauthorizedError, ForbiddenError, NotFoundError } from "@/lib/errors/AppError";

type Params = { params: Promise<{ id: string }> };

/**
 * DELETE /api/identity-documents/:id — admin hapus dokumen identitas
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session) throw new UnauthorizedError("Belum login");
    if ((session.user as { role: string }).role !== "ADMIN") {
      throw new ForbiddenError("Hanya admin yang dapat menghapus dokumen identitas");
    }

    const { id } = await params;

    const doc = await prisma.identityDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundError("Dokumen tidak ditemukan");

    // Hapus dari Cloudinary
    try {
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      if (cloudName) {
        const pattern = new RegExp(
          `res\\.cloudinary\\.com/${cloudName}/(?:image|video|raw)/(?:upload|private|authenticated)/(?:v\\d+/)?(.+?)(?:\\.[^./]+)?$`
        );
        const match = pattern.exec(doc.document_url);
        if (match?.[1]) {
          await cloudinary.uploader.destroy(match[1], { resource_type: "image", invalidate: true });
        }
      }
    } catch (e) {
      console.warn("[DELETE_IDENTITY_DOC] Gagal hapus dari Cloudinary:", e);
      // Tetap lanjut hapus dari DB
    }

    await prisma.identityDocument.delete({ where: { id } });

    // Reset verification_status user ke PENDING
    await prisma.user.update({
      where: { id: doc.user_id },
      data: { verification_status: "PENDING" },
    });

    console.info("[AUDIT]", JSON.stringify({
      adminId: (session.user as { id: string }).id,
      action: "DELETE_IDENTITY_DOCUMENT",
      documentId: id,
      documentOwnerId: doc.user_id,
      timestamp: new Date().toISOString(),
    }));

    return apiResponse.success(null, "Dokumen identitas berhasil dihapus.");
  } catch (error) {
    return handleError(error);
  }
}
