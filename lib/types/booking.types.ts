import type {
  Booking,
  BookingStatus,
  RoomUnit,
  Payment,
  Review,
} from "@prisma/client";
import type { RoomDetail } from "./room.types";

/**
 * Input type for creating a new booking.
 * Note: total_price is intentionally excluded — it is always calculated server-side.
 */
export type CreateBookingInput = {
  room_id: string;
  start_date: string | Date;
  duration_periods: number;
};

/**
 * Full booking detail including related room, unit, and user information.
 * Derives base fields from the Prisma Booking model.
 */
export type BookingDetail = Booking & {
  room_unit: RoomUnit & {
    room: RoomDetail;
  };
  payment: Payment | null;
  review: Review | null;
};

/**
 * Input for updating a booking's status (admin only).
 */
export type UpdateBookingStatusInput = {
  status: "DP_PENDING" | "REJECTED";
  admin_note?: string;
};

/**
 * Input for cancelling a booking by the owning user.
 * cancellationMessage is optional — user may omit a reason.
 * Requirements: 5.2, 5.3
 */
export type CancelBookingInput = {
  bookingId: string;
  cancellationMessage?: string;
};

// Re-export Prisma types for convenience
export type { Booking, BookingStatus };
