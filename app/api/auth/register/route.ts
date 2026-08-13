import { NextRequest } from "next/server";

import { ValidationError } from "@/lib/errors/AppError";
import { handleError } from "@/lib/errors/handleError";
import { authService } from "@/lib/services/auth.service";
import { apiResponse } from "@/lib/utils/apiResponse";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { registerSchema } from "@/lib/validations/auth";

// POST /api/auth/register — daftarkan pengguna baru
export async function POST(req: NextRequest) {
  try {
    // 1. Rate limiting per IP — Requirement 7.1, 7.2, 7.3, 7.7
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const rateLimit = await checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return apiResponse.error(
        "Coba lagi setelah 15 menit",
        429,
        "RATE_LIMIT_EXCEEDED"
      );
    }

    // 2. Parse + validasi payload
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Validasi gagal");
    }

    // 3. Delegasikan logika bisnis ke authService
    const user = await authService.register(parsed.data);

    // 4. Kembalikan response 201 — password tidak pernah ada di SafeUser (Requirement 8.2)
    return apiResponse.created(user, "Registrasi berhasil");
  } catch (error) {
    return handleError(error);
  }
}
