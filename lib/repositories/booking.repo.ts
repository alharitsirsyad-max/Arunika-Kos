import { prisma } from "@/lib/prisma";
import type { BookingStatus } from "@prisma/client";

/**
 * Data required to create a new booking.
 * total_price is always calculated server-side — never from client input.
 */
export type CreateBookingData = {
  user_id: string;
  room_unit_id: string;
  start_date: Date;
  duration_periods: number;
  total_price: number;
};

/** Explicit select shape for a booking row */
const bookingSelect = {
  id: true,
  user_id: true,
  room_unit_id: true,
  start_date: true,
  duration_periods: true,
  total_price: true,
  status: true,
  admin_note: true,
  cancellation_message: true,
  last_reminder_sent_at: true,
  created_at: true,
  room_unit: {
    select: {
      id: true,
      room_id: true,
      room_number: true,
      status: true,
      room: {
        select: {
          id: true,
          name: true,
          price: true,
          period_months: true,
          facilities: true,
          description: true,
          capacity: true,
          created_at: true,
          images: {
            select: {
              id: true,
              room_id: true,
              image_url: true,
            },
          },
        },
      },
    },
  },
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  invoices: {
    select: {
      id: true,
      booking_id: true,
      type: true,
      extra_duration_months: true,
      amount: true,
      due_date: true,
      status: true,
      grace_period_days: true,
      late_fee_per_day: true,
      is_late_fee_waived: true,
      receipt_number: true,
      created_at: true,
    },
  },
  agreement: {
    select: {
      id: true,
      booking_id: true,
      room_unit_id: true,
      agreed_start_date: true,
      agreed_price: true,
      status: true,
      confirmed_by: true,
      confirmed_at: true,
      created_at: true,
    },
  },
  review: {
    select: {
      id: true,
      user_id: true,
      booking_id: true,
      rating: true,
      comment: true,
      created_at: true,
    },
  },
} as const;

export const bookingRepo = {
  /**
   * Find a single booking by ID.
   */
  async findById(id: string) {
    return prisma.booking.findUnique({
      where: { id },
      select: bookingSelect,
    });
  },

  /**
   * Find all bookings belonging to a specific user.
   * Always applies WHERE user_id = userId — never returns other users' bookings.
   */
  async findByUserId(userId: string) {
    return prisma.booking.findMany({
      where: { user_id: userId },
      select: bookingSelect,
      orderBy: { created_at: "desc" },
    });
  },

  /**
   * Find all bookings without ownership filter.
   * For admin use only.
   */
  async findAll() {
    return prisma.booking.findMany({
      select: bookingSelect,
      orderBy: { created_at: "desc" },
    });
  },

  /**
   * Create a new booking record.
   */
  async create(data: CreateBookingData) {
    return prisma.booking.create({
      data: {
        user_id: data.user_id,
        room_unit_id: data.room_unit_id,
        start_date: data.start_date,
        duration_periods: data.duration_periods,
        total_price: data.total_price,
      },
      select: bookingSelect,
    });
  },

  /**
   * Update the status of a booking.
   */
  async updateStatus(id: string, status: BookingStatus) {
    return prisma.booking.update({
      where: { id },
      data: { status },
      select: bookingSelect,
    });
  },

  /**
   * Count active bookings (PENDING / APPROVED / ACTIVE) linked to a room.
   * Used by RoomService before deleting a room.
   */
  async countActiveByRoomId(roomId: string): Promise<number> {
    return prisma.booking.count({
      where: {
        room_unit: { room_id: roomId },
        status: { in: ["PENDING", "APPROVED", "ACTIVE"] },
      },
    });
  },

  /**
   * Find bookings that compete for the same room unit.
   * Returns bookings with status DP_PENDING or DP_PAID for the given unit,
   * excluding the specified booking ID.
   * Used for conflict detection before approving a booking.
   * Requirements: 3.1
   */
  async findCompetingBookings(roomUnitId: string, excludeBookingId: string) {
    return prisma.booking.findMany({
      where: {
        room_unit_id: roomUnitId,
        status: { in: ["DP_PENDING", "DP_PAID"] },
        id: { not: excludeBookingId },
      },
      select: {
        id: true,
        status: true,
        room_unit_id: true,
        user_id: true,
        created_at: true,
      },
    });
  },

  /**
   * Cancel a booking by setting its status to CANCELLED
   * and optionally storing a cancellation message.
   * Requirements: 5.3
   */
  async cancelBooking(bookingId: string, cancellationMessage?: string) {
    return prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "CANCELLED",
        cancellation_message: cancellationMessage ?? null,
      },
      select: bookingSelect,
    });
  },

  /**
   * Batch-expire all competing bookings on a room unit.
   * Sets status to EXPIRED for all bookings with status PENDING or DP_PENDING
   * on the given unit, excluding the winner booking.
   * Uses updateMany for efficient batch update.
   * Requirements: 4.6
   */
  async expireCompetingBookings(
    roomUnitId: string,
    winnerBookingId: string
  ): Promise<number> {
    const result = await prisma.booking.updateMany({
      where: {
        room_unit_id: roomUnitId,
        status: { in: ["PENDING", "DP_PENDING"] },
        id: { not: winnerBookingId },
      },
      data: { status: "EXPIRED" },
    });
    return result.count;
  },
};
