import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { roomService } from "@/lib/services/room.service";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import {
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
} from "@/lib/errors/AppError";

type Params = { params: Promise<{ id: string }> };

// POST /api/rooms/:id/images — upload gambar kamar (admin only)
// Requirements: 12.1–12.8, 17.1
export async function POST(req: NextRequest, { params }: Params) {
  try {
    // Req 12.8 — hanya user yang sudah login
    const session = await auth();
    if (!session) throw new UnauthorizedError("Belum login");

    // Req 17.1 & 9.4 — hanya ADMIN
    if (session.user.role !== "ADMIN") {
      const { id } = await params;
      console.info(
        `[SECURITY] ${new Date().toISOString()} | Non-admin tried POST /api/rooms/${id}/images | userId=${session.user.id}`
      );
      throw new ForbiddenError("Hanya admin yang dapat mengupload gambar kamar");
    }

    const { id: roomId } = await params;

    // Parse FormData dan ambil file
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      throw new ValidationError("File tidak ditemukan dalam request");
    }

    // Delegasi validasi MIME, ukuran, upload Cloudinary, dan simpan ke DB ke service layer
    const result = await roomService.uploadRoomImage(roomId, file);

    // Req 12.6 — return { image_url }
    return apiResponse.created(result, "Gambar berhasil diupload");
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/rooms/:id/images — hapus gambar berdasarkan image_id (admin only)
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session) throw new UnauthorizedError("Belum login");

    if (session.user.role !== "ADMIN") {
      const { id } = await params;
      console.info(
        `[SECURITY] ${new Date().toISOString()} | Non-admin tried DELETE /api/rooms/${id}/images | userId=${session.user.id}`
      );
      throw new ForbiddenError("Hanya admin yang dapat menghapus gambar kamar");
    }

    const { id: roomId } = await params;
    const body = await req.json() as { image_id?: string };
    const { image_id } = body;

    if (!image_id) {
      throw new ValidationError("image_id wajib diisi");
    }

    await roomService.deleteRoomImage(roomId, image_id);

    return apiResponse.success(null, "Gambar berhasil dihapus");
  } catch (error) {
    return handleError(error);
  }
}
