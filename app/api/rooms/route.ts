import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { roomService } from "@/lib/services/room.service";
import { createRoomSchema } from "@/lib/validations/room";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import { UnauthorizedError, ForbiddenError, ValidationError } from "@/lib/errors/AppError";

// GET /api/rooms — daftar semua tipe kamar (publik)
export async function GET() {
  try {
    const rooms = await roomService.getRooms();
    return apiResponse.success(rooms, "Daftar kamar berhasil diambil");
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/rooms — buat tipe kamar baru (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) throw new UnauthorizedError("Belum login");

    if (session.user.role !== "ADMIN") {
      console.info(
        `[SECURITY] ${new Date().toISOString()} | Non-admin tried POST /api/rooms | userId=${session.user.id}`
      );
      throw new ForbiddenError("Hanya admin yang dapat membuat kamar");
    }

    const body = await req.json();

    // Ambil unit_count dari body (opsional, default 1)
    const { unit_count = 1, ...roomData } = body;
    const unitCount = Math.min(Math.max(Number(unit_count) || 1, 1), 50);

    const parsed = createRoomSchema.safeParse(roomData);
    if (!parsed.success) {
      throw new ValidationError("Validasi gagal: " + JSON.stringify(parsed.error.flatten().fieldErrors));
    }

    const room = await roomService.createRoom(parsed.data);

    // Buat unit otomatis sesuai jumlah yang diminta
    const prefix = parsed.data.name.trim()[0].toUpperCase();
    const { prisma } = await import("@/lib/prisma");
    for (let i = 1; i <= unitCount; i++) {
      await prisma.roomUnit.create({
        data: {
          room_id: room.id,
          room_number: `${prefix}${i}`,
          status: "AVAILABLE",
        },
      });
    }

    return apiResponse.created({ ...room, units_created: unitCount }, "Kamar berhasil dibuat");
  } catch (error) {
    return handleError(error);
  }
}
