import { prisma } from "@/lib/prisma";

/**
 * Data required to create a new review.
 */
export type CreateReviewData = {
  user_id: string;
  booking_id: string;
  rating: number;
  comment: string;
};

/** Explicit select shape for a review row */
const reviewSelect = {
  id: true,
  user_id: true,
  booking_id: true,
  rating: true,
  comment: true,
  created_at: true,
  user: {
    select: {
      id: true,
      name: true,
      avatar_url: true,
    },
  },
  booking: {
    select: {
      id: true,
      room_unit: {
        select: {
          room: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  },
} as const;

export const reviewRepo = {
  /**
   * Find a review by booking ID.
   * Returns null if no review exists for the booking.
   */
  async findByBookingId(bookingId: string) {
    return prisma.review.findUnique({
      where: { booking_id: bookingId },
      select: reviewSelect,
    });
  },

  /**
   * Create a new review.
   */
  async create(data: CreateReviewData) {
    return prisma.review.create({
      data: {
        user_id: data.user_id,
        booking_id: data.booking_id,
        rating: data.rating,
        comment: data.comment,
      },
      select: reviewSelect,
    });
  },

  /**
   * Find all reviews for a specific room.
   */
  async findByRoomId(roomId: string) {
    return prisma.review.findMany({
      where: {
        booking: {
          room_unit: {
            room_id: roomId,
          },
        },
      },
      select: reviewSelect,
      orderBy: { created_at: "desc" },
    });
  },
};
