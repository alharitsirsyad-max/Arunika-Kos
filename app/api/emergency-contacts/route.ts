import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import { UnauthorizedError, ValidationError } from "@/lib/errors/AppError";
import { validateIndonesianPhone } from "@/lib/utils/phone-validation";
import { RelationshipType } from "@prisma/client";

const emergencyContactSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(100, "Nama maksimal 100 karakter"),
  relationship: z.nativeEnum(RelationshipType),
  phone_number: z.string().min(1, "Nomor telepon wajib diisi"),
});

/**
 * GET /api/emergency-contacts — ambil semua kontak darurat milik user yang login
 * Auth: USER (login required)
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session) throw new UnauthorizedError("Belum login");

    const userId = session.user!.id!;

    const contacts = await prisma.emergencyContact.findMany({
      where: { user_id: userId },
    });

    return apiResponse.success(contacts, "Berhasil mengambil kontak darurat");
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/emergency-contacts — tambah kontak darurat baru
 * Auth: USER (login required)
 *
 * Body: { name, relationship, phone_number }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) throw new UnauthorizedError("Belum login");

    const userId = session.user!.id!;

    const body = await req.json();
    const parsed = emergencyContactSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        `Validasi gagal: ${JSON.stringify(parsed.error.flatten())}`
      );
    }

    if (!validateIndonesianPhone(parsed.data.phone_number)) {
      throw new ValidationError(
        "Format nomor telepon tidak valid. Gunakan format 08... atau +62..., 10–13 digit.",
        "INVALID_PHONE_FORMAT"
      );
    }

    const contact = await prisma.emergencyContact.create({
      data: {
        user_id: userId,
        name: parsed.data.name,
        relationship: parsed.data.relationship,
        phone_number: parsed.data.phone_number,
      },
    });

    return apiResponse.created(contact, "Kontak darurat berhasil ditambahkan");
  } catch (error) {
    return handleError(error);
  }
}
