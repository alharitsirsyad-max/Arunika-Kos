import { BookingStatus } from "@prisma/client";
import { isValidBookingTransition } from "./booking-state";

describe("isValidBookingTransition", () => {
  // ── Valid transitions (the happy path) ─────────────────────────────────────
  it("allows PENDING → DP_PENDING (admin approve)", () => {
    expect(isValidBookingTransition(BookingStatus.PENDING, BookingStatus.DP_PENDING)).toBe(true);
  });

  it("allows PENDING → REJECTED (admin reject)", () => {
    expect(isValidBookingTransition(BookingStatus.PENDING, BookingStatus.REJECTED)).toBe(true);
  });

  it("allows PENDING → EXPIRED (race condition: another booking paid DP first)", () => {
    expect(isValidBookingTransition(BookingStatus.PENDING, BookingStatus.EXPIRED)).toBe(true);
  });

  it("allows DP_PENDING → DP_PAID (Invoice DP marked PAID)", () => {
    expect(isValidBookingTransition(BookingStatus.DP_PENDING, BookingStatus.DP_PAID)).toBe(true);
  });

  it("allows DP_PENDING → EXPIRED (race condition)", () => {
    expect(isValidBookingTransition(BookingStatus.DP_PENDING, BookingStatus.EXPIRED)).toBe(true);
  });

  it("allows DP_PAID → ACTIVE (agreed_start_date met + Agreement CONFIRMED)", () => {
    expect(isValidBookingTransition(BookingStatus.DP_PAID, BookingStatus.ACTIVE)).toBe(true);
  });

  it("allows ACTIVE → DONE (admin / cron completes the booking)", () => {
    expect(isValidBookingTransition(BookingStatus.ACTIVE, BookingStatus.DONE)).toBe(true);
  });

  // ── Invalid / skipped transitions ──────────────────────────────────────────
  it("rejects PENDING → ACTIVE (cannot skip DP steps)", () => {
    expect(isValidBookingTransition(BookingStatus.PENDING, BookingStatus.ACTIVE)).toBe(false);
  });

  it("rejects PENDING → DONE", () => {
    expect(isValidBookingTransition(BookingStatus.PENDING, BookingStatus.DONE)).toBe(false);
  });

  it("rejects DP_PENDING → ACTIVE (must pay DP first)", () => {
    expect(isValidBookingTransition(BookingStatus.DP_PENDING, BookingStatus.ACTIVE)).toBe(false);
  });

  it("rejects DP_PAID → DONE (must go through ACTIVE)", () => {
    expect(isValidBookingTransition(BookingStatus.DP_PAID, BookingStatus.DONE)).toBe(false);
  });

  // ── Terminal states – nothing should leave these ───────────────────────────
  it("rejects any transition FROM DONE (terminal)", () => {
    const targets = [
      BookingStatus.PENDING,
      BookingStatus.DP_PENDING,
      BookingStatus.DP_PAID,
      BookingStatus.ACTIVE,
      BookingStatus.REJECTED,
      BookingStatus.EXPIRED,
    ];
    targets.forEach((to) => {
      expect(isValidBookingTransition(BookingStatus.DONE, to)).toBe(false);
    });
  });

  it("rejects any transition FROM REJECTED (terminal)", () => {
    const targets = [
      BookingStatus.PENDING,
      BookingStatus.DP_PENDING,
      BookingStatus.DP_PAID,
      BookingStatus.ACTIVE,
      BookingStatus.DONE,
      BookingStatus.EXPIRED,
    ];
    targets.forEach((to) => {
      expect(isValidBookingTransition(BookingStatus.REJECTED, to)).toBe(false);
    });
  });

  it("rejects any transition FROM EXPIRED (terminal)", () => {
    const targets = [
      BookingStatus.PENDING,
      BookingStatus.DP_PENDING,
      BookingStatus.DP_PAID,
      BookingStatus.ACTIVE,
      BookingStatus.DONE,
      BookingStatus.REJECTED,
    ];
    targets.forEach((to) => {
      expect(isValidBookingTransition(BookingStatus.EXPIRED, to)).toBe(false);
    });
  });

  // ── Self-transitions (same status) ─────────────────────────────────────────
  it("rejects self-transition PENDING → PENDING", () => {
    expect(isValidBookingTransition(BookingStatus.PENDING, BookingStatus.PENDING)).toBe(false);
  });

  it("rejects self-transition ACTIVE → ACTIVE", () => {
    expect(isValidBookingTransition(BookingStatus.ACTIVE, BookingStatus.ACTIVE)).toBe(false);
  });
});
