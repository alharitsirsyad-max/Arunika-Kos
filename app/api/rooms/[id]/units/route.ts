import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createRoomUnitSchema } from "@/lib/validations/room";

type Params = { params: Promise<{ id: string }> };

// GET /api/rooms/:id/units — list unit kamar (publik)
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id: roomId } = await params;
    const units = await prisma.roomUnit.findMany({
      where: { room_id: roomId },
      orderBy: { room_number: "asc" },
    });
    return NextResponse.json(units);
  } catch {
    return NextResponse.json({ error: "Gagal mengambil data unit kamar" }, { status: 500 });
  }
}

// POST /api/rooms/:id/units — tambah unit kamar baru (admin only)
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session.user as { role: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: roomId } = await params;
    const body = await req.json();
    const parsed = createRoomUnitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validasi gagal", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { room_number } = parsed.data;

    // Cek duplikasi nomor kamar dalam room yang sama
    const existing = await prisma.roomUnit.findFirst({
      where: { room_id: roomId, room_number },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Nomor kamar "${room_number}" sudah ada di tipe kamar ini` },
        { status: 409 }
      );
    }

    const unit = await prisma.roomUnit.create({
      data: { room_id: roomId, room_number, status: "AVAILABLE" },
    });

    return NextResponse.json(unit, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal menambah unit kamar" }, { status: 500 });
  }
}
