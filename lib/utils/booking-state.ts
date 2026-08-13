import { BookingStatus } from "@prisma/client";

/**
 * Defines all valid booking status transitions according to the booking lifecycle.
 *
 * Lifecycle:
 *   PENDING → DP_PENDING  (admin approve)
 *   PENDING → REJECTED    (admin reject, terminal)
 *   PENDING → EXPIRED     (race condition, another booking paid DP first)
 *   PENDING → CANCELLED   (user cancels)
 *   DP_PENDING → DP_PAID  (Invoice DP → PAID, atomic)
 *   DP_PENDING → EXPIRED  (race condition)
 *   DP_PENDING → CANCELLED (user cancels before paying DP)
 *   DP_PAID → ACTIVE      (agreed_start_date ≤ today + Agreement CONFIRMED, cron/manual)
 *   ACTIVE → DONE         (admin / cron)
 *
 * Terminal states (no outgoing transitions): REJECTED, EXPIRED, DONE, CANCELLED
 *
 * Ref: Requirements 2.5, 5.3, Design: Alur State Booking
 */
const VALID_TRANSITIONS: Readonly<Record<BookingStatus, readonly BookingStatus[]>> = {
  [BookingStatus.PENDING]: [
    BookingStatus.DP_PENDING,
    BookingStatus.REJECTED,
    BookingStatus.EXPIRED,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.DP_PENDING]: [
    BookingStatus.DP_PAID,
    BookingStatus.EXPIRED,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.DP_PAID]: [
    BookingStatus.ACTIVE,
  ],
  [BookingStatus.ACTIVE]: [
    BookingStatus.DONE,
  ],
  // Terminal states — no outgoing transitions
  [BookingStatus.DONE]: [],
  [BookingStatus.REJECTED]: [],
  [BookingStatus.EXPIRED]: [],
  [BookingStatus.CANCELLED]: [],
  // Legacy value — no transitions allowed from APPROVED in the new lifecycle
  [BookingStatus.APPROVED]: [],
};

/**
 * Returns true if transitioning a booking from `from` to `to` is a valid
 * operation according to the booking lifecycle state machine.
 *
 * @param from - The current booking status
 * @param to   - The desired next booking status
 * @returns    `true` if the transition is allowed, `false` otherwise
 *
 * @example
 * isValidBookingTransition("PENDING", "DP_PENDING") // true
 * isValidBookingTransition("PENDING", "ACTIVE")     // false
 * isValidBookingTransition("DONE", "ACTIVE")        // false
 */
export function isValidBookingTransition(
  from: BookingStatus,
  to: BookingStatus
): boolean {
  const allowedTargets = VALID_TRANSITIONS[from];
  return allowedTargets.includes(to);
}
