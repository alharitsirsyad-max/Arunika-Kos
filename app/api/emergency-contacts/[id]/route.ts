import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import {
  UnauthorizedError,
  ValidationError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/errors/AppError";
import { validateIndonesianPhone } from "@/lib/utils/phone-validation";
import { RelationshipType } from "@prisma/client";

const emergencyContactSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(100, "Nama maksimal 100 karakter"),
  relationship: z.nativeEnum(RelationshipType),
  phone_number: z.string().min(1, "Nomor telepon wajib diisi"),
});

type Params = { params: Promise<{ id: string }> };

/**
 * PUT /api/emergency-contacts/:id — perbarui kontak darurat
 * Auth: USER (login required, harus pemilik kontak)
 */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session) throw new UnauthorizedError("Belum login");

    const userId = session.user!.id!;
    const { id } = await params;

    const contact = await prisma.emergencyContact.findUnique({ where: { id } });
    if (!contact) throw new NotFoundError("Kontak darurat tidak ditemukan");

    if (contact.user_id !== userId) {
      throw new ForbiddenError("Anda tidak berhak mengubah kontak darurat ini");
    }

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

    const updated = await prisma.emergencyContact.update({
      where: { id },
      data: {
        name: parsed.data.name,
        relationship: parsed.data.relationship,
        phone_number: parsed.data.phone_number,
      },
    });

    return apiResponse.success(updated, "Kontak darurat berhasil diperbarui");
  } catch (error) {
    return handleError(error);
  }
}

/**
 * DELETE /api/emergency-contacts/:id — hapus kontak darurat
 * Auth: USER (login required, harus pemilik kontak)
 * Tidak boleh menghapus jika hanya tersisa satu kontak darurat.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session) throw new UnauthorizedError("Belum login");

    const userId = session.user!.id!;
    const { id } = await params;

    const contact = await prisma.emergencyContact.findUnique({ where: { id } });
    if (!contact) throw new NotFoundError("Kontak darurat tidak ditemukan");

    if (contact.user_id !== userId) {
      throw new ForbiddenError("Anda tidak berhak menghapus kontak darurat ini");
    }

    const count = await prisma.emergencyContact.count({ where: { user_id: userId } });
    if (count === 1) {
      throw new ValidationError(
        "Minimal satu kontak darurat harus tersedia",
        "LAST_CONTACT"
      );
    }

    await prisma.emergencyContact.delete({ where: { id } });

    return apiResponse.success({ message: "Kontak darurat dihapus" }, "Kontak darurat dihapus");
  } catch (error) {
    return handleError(error);
  }
}
