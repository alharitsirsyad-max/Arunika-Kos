import { bookingRepo } from "@/lib/repositories/booking.repo";
import { reviewRepo } from "@/lib/repositories/review.repo";
import { AppError, ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors/AppError";
import type { CreateReviewInput } from "@/lib/validations/review";

export const reviewService = {
  /**
   * Create a review for a completed booking.
   *
   * Rules (Requirements 23.1–23.5):
   * 1. Booking must exist and belong to the requesting user.
   * 2. Booking must have status DONE — otherwise error code BOOKING_NOT_DONE.
   * 3. Only one review is allowed per booking (unique constraint on booking_id).
   * 4. Returns full review with user name and room detail.
   */
  async createReview(userId: string, input: CreateReviewInput) {
    // 1. Fetch booking — 404 if not found
    const booking = await bookingRepo.findById(input.booking_id);

    if (!booking) {
      throw new NotFoundError("Booking tidak ditemukan");
    }

    // 2. Ownership check — user may only review their own booking
    if (booking.user_id !== userId) {
      throw new ForbiddenError("Kamu tidak memiliki akses ke booking ini");
    }

    // 3. Booking must be DONE (Requirement 23.1, 23.2)
    // Use AppError directly to emit the specific code BOOKING_NOT_DONE (HTTP 400)
    if (booking.status !== "DONE") {
      throw new AppError(
        "Review hanya dapat diberikan untuk booking yang sudah selesai (status DONE)",
        400,
        "BOOKING_NOT_DONE"
      );
    }

    // 4. Duplicate check — one review per booking (Requirement 23.4)
    const existing = await reviewRepo.findByBookingId(input.booking_id);
    if (existing) {
      throw new ConflictError("Kamu sudah memberikan review untuk booking ini");
    }

    // 5. Create and return the review with user + room data (Requirement 23.5)
    return reviewRepo.create({
      user_id: userId,
      booking_id: input.booking_id,
      rating: input.rating,
      comment: input.comment,
    });
  },
};
