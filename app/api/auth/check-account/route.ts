import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/auth/check-account
 * Cek tipe akun berdasarkan email — apakah akun Google-only (tidak punya password).
 * Digunakan di frontend untuk menampilkan pesan error yang lebih informatif.
 *
 * Tidak mengembalikan data sensitif — hanya flag boolean.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : null;

    if (!email) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { password: true, google_id: true },
    });

    if (!user) {
      // Jangan bocorkan apakah email ada atau tidak
      return NextResponse.json({ success: true, data: { is_google_only: false } });
    }

    const isGoogleOnly = !user.password && !!user.google_id;

    return NextResponse.json({ success: true, data: { is_google_only: isGoogleOnly } });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
