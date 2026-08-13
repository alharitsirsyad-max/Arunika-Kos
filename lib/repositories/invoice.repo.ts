import { prisma } from "@/lib/prisma";
import type { InvoiceStatus } from "@prisma/client";
import type { CreateInvoiceData } from "@/lib/types/invoice.types";

/** Explicit select for public invoice fields */
const invoiceSelect = {
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
} as const;

/** Extended select that includes booking + room for price calculation */
const invoiceWithBookingSelect = {
  ...invoiceSelect,
  booking: {
    select: {
      id: true,
      user_id: true,
      room_unit_id: true,
      start_date: true,
      duration_periods: true,
      total_price: true,
      status: true,
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
            },
          },
        },
      },
    },
  },
} as const;

export const invoiceRepo = {
  /**
   * Find a single invoice by ID, including booking and room data.
   * Used for price calculation and ownership checks.
   */
  async findById(id: string) {
    return prisma.invoice.findUnique({
      where: { id },
      select: invoiceWithBookingSelect,
    });
  },

  /**
   * Find all invoices belonging to a specific booking.
   */
  async findByBookingId(bookingId: string) {
    return prisma.invoice.findMany({
      where: { booking_id: bookingId },
      select: invoiceSelect,
      orderBy: { created_at: "desc" },
    });
  },

  /**
   * Find all invoices belonging to a specific user.
   * Filters via booking.user_id join — never exposes other users' invoices.
   */
  async findByUserId(userId: string) {
    return prisma.invoice.findMany({
      where: { booking: { user_id: userId } },
      select: invoiceSelect,
      orderBy: { created_at: "desc" },
    });
  },

  /**
   * Create a new invoice record.
   */
  async create(data: CreateInvoiceData) {
    return prisma.invoice.create({
      data: {
        booking_id: data.booking_id,
        type: data.type,
        extra_duration_months: data.extra_duration_months ?? null,
        amount: data.amount,
        due_date: data.due_date,
        status: "UNPAID",
      },
      select: invoiceSelect,
    });
  },

  /**
   * Update the status of an invoice.
   */
  async updateStatus(id: string, status: InvoiceStatus) {
    return prisma.invoice.update({
      where: { id },
      data: { status },
      select: invoiceSelect,
    });
  },

  /**
   * Find all invoices without ownership filter.
   * For admin use only — includes booking and user data.
   */
  async findAll() {
    return prisma.invoice.findMany({
      select: {
        ...invoiceSelect,
        booking: {
          select: {
            id: true,
            user_id: true,
            status: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });
  },
};
