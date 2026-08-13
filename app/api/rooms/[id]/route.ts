import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { roomService } from "@/lib/services/room.service";
import { updateRoomSchema } from "@/lib/validations/room";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import { UnauthorizedError, ForbiddenError, ValidationError } from "@/lib/errors/AppError";

type Params = { params: Promise<{ id: string }> };

// GET /api/rooms/:id — detail satu tipe kamar (publik)
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const room = await roomService.getRoomById(id);
    return apiResponse.success(room, "Detail kamar berhasil diambil");
  } catch (error) {
    return handleError(error);
  }
}

// PUT /api/rooms/:id — update tipe kamar (admin only)
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session) throw new UnauthorizedError("Belum login");

    if (session.user.role !== "ADMIN") {
      // Req 9.5 & 14.2: log akses non-admin ke endpoint admin
      const { id } = await params;
      console.info(
        `[SECURITY] ${new Date().toISOString()} | Non-admin tried PUT /api/rooms/${id} | userId=${session.user.id}`
      );
      throw new ForbiddenError("Hanya admin yang dapat mengubah kamar");
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = updateRoomSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Validasi gagal: " + JSON.stringify(parsed.error.flatten().fieldErrors));
    }

    const room = await roomService.updateRoom(id, parsed.data);
    return apiResponse.success(room, "Kamar berhasil diubah");
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/rooms/:id — hapus tipe kamar (admin only)
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session) throw new UnauthorizedError("Belum login");

    if (session.user.role !== "ADMIN") {
      // Req 9.5 & 14.2: log akses non-admin ke endpoint admin
      const { id } = await params;
      console.info(
        `[SECURITY] ${new Date().toISOString()} | Non-admin tried DELETE /api/rooms/${id} | userId=${session.user.id}`
      );
      throw new ForbiddenError("Hanya admin yang dapat menghapus kamar");
    }

    const { id } = await params;
    await roomService.deleteRoom(id);
    return apiResponse.success(null, "Kamar berhasil dihapus");
  } catch (error) {
    return handleError(error);
  }
}
