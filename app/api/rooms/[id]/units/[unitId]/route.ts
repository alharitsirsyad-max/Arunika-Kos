import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import { UnauthorizedError, ForbiddenError, ValidationError } from "@/lib/errors/AppError";
import { roomService } from "@/lib/services/room.service";
import type { UnitStatus } from "@prisma/client";

type Params = { params: Promise<{ id: string; unitId: string }> };

// Hanya tiga pilihan yang valid untuk admin
const VALID_STATUSES: UnitStatus[] = ["AVAILABLE", "OCCUPIED", "RESERVED"];

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session) throw new UnauthorizedError("Belum login");
    if ((session.user as { role: string }).role !== "ADMIN") {
      throw new ForbiddenError("Hanya admin yang dapat mengubah status unit");
    }

    const { id: roomId, unitId } = await params;
    const body = await req.json();
    const { status, note } = body;

    if (!VALID_STATUSES.includes(status)) {
      throw new ValidationError(
        "Status tidak valid. Gunakan AVAILABLE atau OCCUPIED",
        "INVALID_STATUS"
      );
    }

    const adminId = session.user!.id!;
    const updatedUnit = await roomService.updateUnitStatus(
      roomId, unitId, adminId, status as UnitStatus, note
    );

    return apiResponse.success(updatedUnit, `Status unit berhasil diubah ke ${status}`);
  } catch (error) {
    return handleError(error);
  }
}
