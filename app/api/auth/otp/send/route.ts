import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { otpService } from "@/lib/services/otp.service";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import { ValidationError } from "@/lib/errors/AppError";

const schema = z.object({
  email: z.string().email("Format email tidak valid"),
  purpose: z.enum(["register", "login"]),
  name: z.string().optional(),
});

/**
 * POST /api/auth/otp/send
 * Kirim OTP ke email untuk register atau login.
 *
 * Untuk "register": email tidak boleh sudah terdaftar
 * Untuk "login": email harus sudah terdaftar
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

    const { email, purpose, name } = parsed.data;

    // Cek apakah Brevo dikonfigurasi — sebelum cek apapun
    if (!process.env.BREVO_API_KEY) {
      return apiResponse.error(
        "Layanan email belum dikonfigurasi. Tambahkan BREVO_API_KEY ke .env",
        503,
        "EMAIL_SERVICE_NOT_CONFIGURED"
      );
    }

    // Cek keberadaan akun — gunakan select field yang pasti ada
    let existing = null;
    try {
      existing = await prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true },
      });
    } catch (dbError) {
      console.error("[OTP/SEND] Database error:", dbError);
      return apiResponse.error(
        "Database belum diperbarui. Jalankan: npx prisma generate && npx prisma db push",
        500,
        "DB_SCHEMA_OUTDATED"
      );
    }

    if (purpose === "login" && !existing) {
      return apiResponse.error("Email tidak terdaftar", 404, "USER_NOT_FOUND");
    }

    if (purpose === "register" && existing) {
      return apiResponse.error("Email sudah terdaftar", 409, "EMAIL_ALREADY_EXISTS");
    }

    const displayName = existing?.name ?? name ?? email.split("@")[0];

    try {
      await otpService.sendOtp(email, displayName, purpose);
    } catch (otpError) {
      if (otpError instanceof Error && otpError.message.startsWith("Tunggu")) {
        return apiResponse.error(otpError.message, 429, "OTP_COOLDOWN");
      }
      // Email service error — return user-friendly message with detail
      const detail = otpError instanceof Error ? otpError.message : "Unknown error";
      console.error("[OTP/SEND] sendOtp error:", detail);
      return apiResponse.error(
        `Gagal mengirim kode OTP: ${detail}`,
        502,
        "EMAIL_SEND_FAILED"
      );
    }

    return apiResponse.success(
      { email, purpose },
      `Kode OTP telah dikirim ke ${email}`
    );
  } catch (error) {
    console.error("[OTP/SEND]", error);
    return handleError(error);
  }
}
