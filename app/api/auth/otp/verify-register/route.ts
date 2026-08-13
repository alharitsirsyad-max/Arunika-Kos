import { NextRequest } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { otpService } from "@/lib/services/otp.service";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import { ValidationError } from "@/lib/errors/AppError";

const schema = z.object({
  email: z.string().email(),
  code: z.string().length(6, "Kode OTP harus 6 digit"),
  name: z.string().min(1, "Nama wajib diisi"),
  password: z.string().min(8, "Password minimal 8 karakter"),
  phone: z.string().min(1, "Nomor telepon wajib diisi"),
});

/**
 * POST /api/auth/otp/verify-register
 * Verifikasi OTP dan selesaikan proses registrasi.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError(
        "Validasi gagal: " + JSON.stringify(parsed.error.flatten().fieldErrors)
      );
    }

    const { email, code, name, password, phone } = parsed.data;

    // Verifikasi OTP
    await otpService.verifyOtp(email, code, "register");

    // Cek email belum terdaftar (double check)
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return apiResponse.error("Email sudah terdaftar", 409, "EMAIL_ALREADY_EXISTS");
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Buat user — handle jika kolom baru belum ada
    let user;
    try {
      user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          phone,
          email_verified: true,
          role: "USER",
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          created_at: true,
        },
      });
    } catch (createError) {
      // Fallback jika kolom email_verified belum ada
      console.warn("[VERIFY_REGISTER] Mencoba tanpa email_verified:", createError);
      user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          phone,
          role: "USER",
        } as Parameters<typeof prisma.user.create>[0]["data"],
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          created_at: true,
        },
      });
    }

    return apiResponse.created(user, "Akun berhasil dibuat");
  } catch (error) {
    if (error instanceof Error && (
      error.message.includes("OTP") ||
      error.message.includes("kadaluarsa")
    )) {
      return apiResponse.error(error.message, 400, "INVALID_OTP");
    }
    return handleError(error);
  }
}
