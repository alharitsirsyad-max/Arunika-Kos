import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { handleError } from "@/lib/errors/handleError";
import { UnauthorizedError, ValidationError } from "@/lib/errors/AppError";
import { apiResponse } from "@/lib/utils/apiResponse";
import { reviewService } from "@/lib/services/review.service";
import { createReviewSchema } from "@/lib/validations/review";

// POST /api/reviews — kirim review (user yang booking-nya DONE)
export async function POST(req: NextRequest) {
  try {
    // 1. Cek session — 401 jika belum login
    const session = await auth();
    if (!session?.user?.id) {
      throw new UnauthorizedError("Kamu harus login untuk memberikan review");
    }

    // 2. Parse + validasi payload dengan Zod
    const body = await req.json();
    const parsed = createReviewSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues.map((e: { message: string }) => e.message).join(", ")
      );
    }

    // 3. Delegasi ke service — semua logika bisnis ada di sana
    const review = await reviewService.createReview(session.user.id, parsed.data);

    // 4. Kembalikan response terformat
    return apiResponse.created(review, "Review berhasil dibuat");
  } catch (error) {
    return handleError(error);
  }
}
