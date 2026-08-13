import { prisma } from "@/lib/prisma";
import type { PaymentStatus } from "@prisma/client";

/**
 * Data required to create a new payment record.
 * Payment is linked to invoice_id per schema (not booking_id).
 */
export type CreatePaymentData = {
  invoice_id: string;
  midtrans_order_id: string;
  amount: number;
  status?: PaymentStatus;
};

/** Explicit select shape for a payment row */
const paymentSelect = {
  id: true,
  invoice_id: true,
  midtrans_order_id: true,
  amount: true,
  status: true,
  payment_method: true,
  paid_at: true,
} as const;

export const paymentRepo = {
  /**
   * Find a payment record by invoice ID.
   */
  async findByInvoiceId(invoiceId: string) {
    return prisma.payment.findUnique({
      where: { invoice_id: invoiceId },
      select: paymentSelect,
    });
  },

  /**
   * Find a payment record by Midtrans order_id.
   * Used for idempotency checks in webhook handling.
   */
  async findByOrderId(orderId: string) {
    return prisma.payment.findUnique({
      where: { midtrans_order_id: orderId },
      select: paymentSelect,
    });
  },

  /**
   * Create a new payment record.
   */
  async create(data: CreatePaymentData) {
    return prisma.payment.create({
      data: {
        invoice_id: data.invoice_id,
        midtrans_order_id: data.midtrans_order_id,
        amount: data.amount,
        status: data.status ?? "PENDING",
      },
      select: paymentSelect,
    });
  },

  /**
   * Update the status of a payment.
   * Optionally sets paid_at when a payment is settled.
   */
  async updateStatus(id: string, status: PaymentStatus, paidAt?: Date) {
    return prisma.payment.update({
      where: { id },
      data: {
        status,
        ...(paidAt !== undefined && { paid_at: paidAt }),
      },
      select: paymentSelect,
    });
  },

  /**
   * Upsert a payment record by invoice_id.
   */
  async upsertByInvoiceId(data: CreatePaymentData) {
    return prisma.payment.upsert({
      where: { invoice_id: data.invoice_id },
      create: {
        invoice_id: data.invoice_id,
        midtrans_order_id: data.midtrans_order_id,
        amount: data.amount,
        status: data.status ?? "PENDING",
      },
      update: {
        midtrans_order_id: data.midtrans_order_id,
        amount: data.amount,
        status: data.status ?? "PENDING",
      },
      select: paymentSelect,
    });
  },
};
