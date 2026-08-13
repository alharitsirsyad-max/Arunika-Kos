import { prisma } from "@/lib/prisma";
import { bookingRepo } from "@/lib/repositories/booking.repo";
import { roomRepo } from "@/lib/repositories/room.repo";
import { identityRepo } from "@/lib/repositories/identity.repo";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/errors/AppError";
import type { CreateBookingInput, UpdateBookingStatusInput } from "@/lib/types/booking.types";

/**
 * Shared select shape for booking mutations inside this service.
 * Must match the actual Prisma schema relations.
 *
 * Booking relations per schema:
 *   - room_unit  (RoomUnit → Room → RoomImage[])
 *   - user       (User)
 *   - invoices   (Invoice[])
 *   - review     (Review?)
 *
 * NOTE: `payment` is on Invoice, NOT on Booking.
 */
const bookingMutationSelect = {
  id: true,
  user_id: true,
  room_unit_id: true,
  start_date: true,
  duration_periods: true,
  total_price: true,
  status: true,
  admin_note: true,
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

export const bookingService = {
  async createBooking(userId: string, input: CreateBookingInput) {
    // Identity gate — user must have a VERIFIED document
    const verifiedDoc = await identityRepo.findVerifiedByUserId(userId);
    if (!verifiedDoc) {
      throw new ForbiddenError(
        "Identitas Anda belum diverifikasi. Silakan upload dokumen identitas di halaman Profil dan tunggu verifikasi admin.",
        "IDENTITY_NOT_VERIFIED"
      );
    }

    // Cek apakah user sudah punya booking aktif (PENDING/DP_PENDING/DP_PAID/ACTIVE)
    const existingBooking = await prisma.booking.findFirst({
      where: {
        user_id: userId,
        status: { in: ["PENDING", "DP_PENDING", "DP_PAID", "ACTIVE"] },
      },
    });
    if (existingBooking) {
      throw new ConflictError(
        "Anda sudah memiliki booking aktif. Selesaikan booking saat ini sebelum membooking kamar lain.",
        "ALREADY_HAS_ACTIVE_BOOKING"
      );
    }

    // Find an AVAILABLE unit for the requested room
    const availableUnit = await roomRepo.findAvailableUnit(input.room_id);
    if (!availableUnit) {
      throw new ConflictError(
        "Tidak ada unit kamar yang tersedia untuk kamar ini"
      );
    }

    // Calculate total_price server-side (price × duration_periods)
    const total_price = availableUnit.room.price * input.duration_periods;

    const start_date =
      input.start_date instanceof Date
        ? input.start_date
        : new Date(input.start_date);

    // Atomic transaction: keep unit AVAILABLE (reserved after DP payment) + create booking
    const booking = await prisma.booking.create({
      data: {
        user_id: userId,
        room_unit_id: availableUnit.id,
        start_date,
        duration_periods: input.duration_periods,
        total_price,
      },
      select: bookingMutationSelect,
    });

    return booking;
  },

  async getBookings(userId: string, role: string) {
    if (role === "ADMIN") {
      const bookings = await bookingRepo.findAll();

      // Compute unit_has_conflict for each booking.
      // Strategy: fetch all unit IDs that currently have at least one
      // DP_PENDING or DP_PAID booking, then tag each booking accordingly.
      // This is done in two queries instead of N queries per booking.
      //
      // Requirements: 3.2 — tombol "Setujui" di-disable jika unit sudah konflik
      const conflictingUnitRows = await prisma.booking.findMany({
        where: { status: { in: ["DP_PENDING", "DP_PAID"] } },
        select: { room_unit_id: true, id: true },
      });

      // Build a Set of unit IDs that have an active (DP_PENDING/DP_PAID) booking
      const activeUnitIds = new Set(
        conflictingUnitRows.map((b) => b.room_unit_id)
      );
      // Map bookingId → whether that booking itself is the active one
      const activeBookingIds = new Set(conflictingUnitRows.map((b) => b.id));

      return bookings.map((booking) => ({
        ...booking,
        // unit_has_conflict is true when the unit has an active booking
        // but the current booking is NOT that active booking itself.
        unit_has_conflict:
          activeUnitIds.has(booking.room_unit_id) &&
          !activeBookingIds.has(booking.id),
      }));
    }
    return bookingRepo.findByUserId(userId);
  },

  async getBookingById(id: string, userId: string, role: string) {
    const booking = await bookingRepo.findById(id);

    if (!booking) {
      throw new NotFoundError(`Booking dengan ID ${id} tidak ditemukan`);
    }

    if (role !== "ADMIN" && booking.user_id !== userId) {
      throw new ForbiddenError("Anda tidak memiliki akses ke booking ini");
    }

    return booking;
  },

  /**
   * Cancel a booking owned by the given user.
   *
   * Business rules (Requirements 5.3, 5.4, 5.5, 5.6):
   * 1. Booking must exist → NotFoundError
   * 2. Booking must belong to userId → ForbiddenError 403
   * 3. Booking status must be PENDING or DP_PENDING → ConflictError 409
   * 4. Wrapped in prisma.$transaction():
   *    a. Set Booking.status → CANCELLED (+ store cancellation_message)
   *    b. If status was DP_PENDING: find related DP invoice and set it to CANCELLED
   * 5. Return updated booking
   */
  async cancelBooking(
    userId: string,
    bookingId: string,
    cancellationMessage?: string
  ) {
    // 1. Fetch booking
    const booking = await bookingRepo.findById(bookingId);

    // 2. Not found
    if (!booking) {
      throw new NotFoundError(`Booking dengan ID ${bookingId} tidak ditemukan`);
    }

    // 3. Ownership check — Requirements 5.6
    if (booking.user_id !== userId) {
      throw new ForbiddenError(
        "Anda tidak memiliki akses untuk membatalkan booking ini"
      );
    }

    // 4. Status check — Requirements 5.3
    const cancellableStatuses = ["PENDING", "DP_PENDING"] as const;
    if (
      !cancellableStatuses.includes(
        booking.status as (typeof cancellableStatuses)[number]
      )
    ) {
      throw new ConflictError(
        `Booking tidak dapat dibatalkan karena statusnya ${booking.status}. Hanya booking dengan status PENDING atau DP_PENDING yang dapat dibatalkan.`,
        "BOOKING_NOT_CANCELLABLE"
      );
    }

    const initialStatus = booking.status;

    // 5. Atomic transaction — Requirements 5.4, 5.5
    const updatedBooking = await prisma.$transaction(async (tx) => {
      // a. Cancel the booking
      const cancelled = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: "CANCELLED",
          cancellation_message: cancellationMessage ?? null,
        },
        select: bookingMutationSelect,
      });

      // b. If status was DP_PENDING, cancel the related DP invoice — Requirements 5.4
      if (initialStatus === "DP_PENDING") {
        const dpInvoice = await tx.invoice.findFirst({
          where: {
            booking_id: bookingId,
            type: "DP",
            status: { not: "CANCELLED" },
          },
        });

        if (dpInvoice) {
          await tx.invoice.update({
            where: { id: dpInvoice.id },
            data: { status: "CANCELLED" },
          });
        }
      }

      return cancelled;
    });

    return updatedBooking;
  },

  async updateBookingStatus(
    bookingId: string,
    input: UpdateBookingStatusInput
  ) {
    const booking = await bookingRepo.findById(bookingId);
    if (!booking) {
      throw new NotFoundError(`Booking dengan ID ${bookingId} tidak ditemukan`);
    }

    if (input.status === "DP_PENDING") {
      if (booking.status !== "PENDING") {
        throw new ConflictError(
          `Booking tidak dapat disetujui karena statusnya bukan PENDING (status saat ini: ${booking.status})`
        );
      }

      // Conflict check — Requirements 3.1, 3.4
      // Cek apakah unit yang sama sudah punya booking DP_PENDING atau DP_PAID
      const competingBookings = await bookingRepo.findCompetingBookings(
        booking.room_unit_id,
        bookingId
      );
      if (competingBookings.length > 0) {
        throw new ConflictError(
          "Unit ini sudah memiliki booking aktif (DP_PENDING atau DP_PAID). Tidak dapat menyetujui booking lain untuk unit yang sama.",
          "UNIT_CONFLICT"
        );
      }

      const dpAmount = parseInt(process.env.DP_AMOUNT ?? "1000000", 10);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7); // jatuh tempo 7 hari

      const updatedBooking = await prisma.$transaction(async (tx) => {
        // 1. Update status booking → DP_PENDING
        const updated = await tx.booking.update({
          where: { id: bookingId },
          data: { status: "DP_PENDING", admin_note: input.admin_note ?? null },
          select: bookingMutationSelect,
        });

        // 2. Cek apakah Invoice DP sudah ada (hindari duplikasi)
        const existingInvoice = await tx.invoice.findFirst({
          where: { booking_id: bookingId, type: "DP" },
        });

        if (!existingInvoice) {
          await tx.invoice.create({
            data: {
              booking_id: bookingId,
              type: "DP",
              amount: dpAmount,
              dp_amount: dpAmount,
              due_date: dueDate,
              status: "UNPAID",
            },
          });
        }

        return updated;
      });

      return updatedBooking;
    }

    // REJECTED
    if (booking.status !== "PENDING") {
      throw new ConflictError(
        `Booking tidak dapat ditolak karena statusnya bukan PENDING (status saat ini: ${booking.status})`
      );
    }

    const [updatedBooking] = await prisma.$transaction([
      prisma.booking.update({
        where: { id: bookingId },
        data: { status: "REJECTED", admin_note: input.admin_note ?? null },
        select: bookingMutationSelect,
      }),
    ]);

    return updatedBooking;
  },
};
