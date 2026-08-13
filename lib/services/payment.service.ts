import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { snap } from "@/lib/midtrans";
import { invoiceRepo } from "@/lib/repositories/invoice.repo";
import { bookingRepo } from "@/lib/repositories/booking.repo";
import { paymentRepo } from "@/lib/repositories/payment.repo";
import { NotFoundError, ConflictError, ValidationError } from "@/lib/errors/AppError";
import { generateReceiptNumber } from "@/lib/utils/receipt-number";
import type { MidtransNotificationPayload, SnapTokenResponse } from "@/lib/types/payment.types";

/**
 * Set of payment statuses considered final — idempotency gate.
 * Once a payment reaches any of these statuses, no further state changes
 * are allowed regardless of incoming webhook notifications.
 * (Requirements 5.1, 5.2, 5.4)
 */
const FINAL_PAYMENT_STATUSES = new Set(["SETTLEMENT", "EXPIRE", "CANCEL"]);

/**
 * Payment Service — contains all payment domain logic.
 *
 * Responsibilities:
 * - Create Midtrans Snap tokens for APPROVED bookings.
 * - Handle webhook notifications from Midtrans with signature verification,
 *   idempotency protection, and atomic database transactions.
 *
 * NOTE: prisma.$transaction is used directly here as the only permitted
 * exception to the "no Prisma import outside repositories" rule.
 * The service only orchestrates the transaction — repos handle query building.
 * (Requirements 1.4, 4.1)
 */
export const paymentService = {
  /**
   * Create a Midtrans Snap token for an invoice.
   *
   * Steps:
   * 1. Fetch the invoice and verify it belongs to the given user.
   * 2. Verify invoice status is UNPAID.
   * 3. Build order_id = "ARUNIKA-{invoiceId}-{timestamp}".
   * 4. Call Midtrans Snap API.
   * 5. Create/update a PENDING payment record linked to invoice_id.
   * 6. Return { token, redirect_url }.
   *
   * Requirements: 5.1
   */
  async createSnapToken(
    userId: string,
    invoiceId: string
  ): Promise<SnapTokenResponse> {
    // Step 1: Fetch invoice with booking to verify ownership
    const invoice = await invoiceRepo.findById(invoiceId);

    if (!invoice) {
      throw new NotFoundError(`Invoice dengan ID ${invoiceId} tidak ditemukan`);
    }

    if (invoice.booking.user_id !== userId) {
      throw new NotFoundError(`Invoice dengan ID ${invoiceId} tidak ditemukan`);
    }

    // Step 2: Invoice must be UNPAID
    if (invoice.status !== "UNPAID") {
      throw new ConflictError(
        `Invoice harus berstatus UNPAID untuk membuat token pembayaran (status saat ini: ${invoice.status})`
      );
    }

    // Step 3: Build unique order_id
    const timestamp = Date.now();
    const orderId = `ARUNIKA-${invoiceId}-${timestamp}`;

    // Step 4: Create Midtrans Snap transaction
    const snapResponse = await snap.createTransaction({
      transaction_details: {
        order_id: orderId,
        gross_amount: invoice.amount,
      },
    });

    // Step 5: Create payment record linked to invoice_id
    await prisma.payment.upsert({
      where: { invoice_id: invoiceId },
      create: {
        invoice_id: invoiceId,
        midtrans_order_id: orderId,
        amount: invoice.amount,
        status: "PENDING",
      },
      update: {
        midtrans_order_id: orderId,
        amount: invoice.amount,
        status: "PENDING",
      },
    });

    // Step 6: Return token and redirect URL
    return {
      token: snapResponse.token as string,
      redirect_url: snapResponse.redirect_url as string,
    };
  },

  /**
   * Handle an incoming webhook notification from Midtrans.
   *
   * Steps:
   * 1. Verify SHA-512 signature.
   *    → ValidationError (HTTP 400) + security log if signature is invalid.
   * 2. Idempotency check: if payment already has a final status, return early.
   * 3. Process the notification based on transaction_status:
   *    - "settlement": atomic transaction → payment SETTLEMENT + booking ACTIVE.
   *    - "expire":     atomic transaction → payment EXPIRE + unit AVAILABLE.
   *    - Other statuses are acknowledged but produce no data changes.
   *
   * Requirements: 5.1–5.5, 11.1–11.6, 4.3, 4.4
   */
  async handleWebhookNotification(
    payload: MidtransNotificationPayload,
    sourceIp?: string
  ): Promise<void> {
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
    } = payload;

    // Step 1: Verify Midtrans signature
    // Formula: SHA512(order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY)
    // (Requirements 11.1, 11.2, 11.4, 11.5)
    const serverKey = process.env.MIDTRANS_SERVER_KEY;

    if (!serverKey) {
      // Misconfiguration — cannot verify without the server key
      console.error(
        `[SECURITY] [${new Date().toISOString()}] Webhook received but MIDTRANS_SERVER_KEY is not configured`
      );
      throw new ValidationError("Konfigurasi server tidak lengkap");
    }

    const expectedSignature = crypto
      .createHash("sha512")
      .update(order_id + status_code + gross_amount + serverKey)
      .digest("hex");

    if (expectedSignature !== signature_key) {
      // Log the security event with timestamp and IP as required by 11.4 and 14.3
      console.error(
        `[SECURITY] [${new Date().toISOString()}] Webhook signature tidak valid | ` +
          `order_id=${order_id} | ip=${sourceIp ?? "unknown"} | ` +
          `status=${transaction_status}`
      );
      throw new ValidationError("Signature webhook tidak valid");
    }

    // Log webhook receipt for audit trail (Requirement 14.3)
    console.info(
      `[AUDIT] [${new Date().toISOString()}] Webhook diterima | ` +
        `order_id=${order_id} | status=${transaction_status} | ` +
        `signature=valid | ip=${sourceIp ?? "unknown"}`
    );

    // Step 2: Idempotency check — look up the payment by order_id
    // (Requirements 5.1, 5.2, 5.4)
    const payment = await paymentRepo.findByOrderId(order_id);

    if (!payment) {
      // No payment record exists for this order_id; nothing to update
      console.warn(
        `[AUDIT] [${new Date().toISOString()}] Webhook untuk order_id yang tidak dikenal diabaikan | ` +
          `order_id=${order_id}`
      );
      return;
    }

    // If the payment has already reached a final status, do nothing.
    // Return silently to maintain the idempotency contract — caller gets HTTP 200.
    // (Requirements 5.1, 5.2, 5.4)
    if (FINAL_PAYMENT_STATUSES.has(payment.status)) {
      console.info(
        `[AUDIT] [${new Date().toISOString()}] Webhook idempotency skip | ` +
          `order_id=${order_id} | current_status=${payment.status} | ` +
          `incoming_status=${transaction_status}`
      );
      return;
    }

    // Step 3: Process based on transaction_status

    if (transaction_status === "settlement") {
      // Atomic: payment → SETTLEMENT + invoice → PAID
      // If invoice.type === INITIAL → booking → APPROVED
      // If invoice.type === EXTENSION → no booking update (awaits admin approve)
      // (Requirements 5.4, 5.5, 5.6)
      const paidAt = new Date();

      // Fetch payment with invoice to determine invoice type
      const paymentWithInvoice = await prisma.payment.findUnique({
        where: { id: payment.id },
        select: {
          id: true,
          invoice_id: true,
          invoice: {
            select: {
              id: true,
              type: true,
              booking_id: true,
            },
          },
        },
      });

      if (!paymentWithInvoice) {
        console.error(`[ERROR] Payment ${payment.id} tidak ditemukan saat proses settlement`);
        return;
      }

      await prisma.$transaction(async (tx) => {
        // Update payment status
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: "SETTLEMENT", paid_at: paidAt },
        });

        // Side effect based on invoice type (Requirement 5.5, 5.6, 2.2, 4.3, 4.4, 4.5)
        if (paymentWithInvoice.invoice.type === "DP") {
          // DP invoice paid → atomically:
          //   1. Mark invoice PAID + generate receipt_number
          //   2. Booking DP_PENDING → DP_PAID
          //   3. Room_Unit → RESERVED
          //   4. Expire all other PENDING/DP_PENDING bookings for same unit
          //   5. Send BOOKING_EXPIRED notifications to affected users
          const receiptNumber = await generateReceiptNumber(tx);

          await tx.invoice.update({
            where: { id: paymentWithInvoice.invoice_id },
            data: { status: "PAID", receipt_number: receiptNumber },
          });

          // Fetch booking to get room_unit_id
          const booking = await tx.booking.findUnique({
            where: { id: paymentWithInvoice.invoice.booking_id },
            select: { id: true, room_unit_id: true, user_id: true },
          });

          if (booking) {
            // Booking DP_PENDING → DP_PAID
            await tx.booking.update({
              where: { id: booking.id },
              data: { status: "DP_PAID" },
            });

            // Room_Unit → RESERVED
            await tx.roomUnit.update({
              where: { id: booking.room_unit_id },
              data: { status: "RESERVED" },
            });

            // Expire all other PENDING/DP_PENDING bookings for same unit
            const otherBookings = await tx.booking.findMany({
              where: {
                room_unit_id: booking.room_unit_id,
                id: { not: booking.id },
                status: { in: ["PENDING", "DP_PENDING"] },
              },
              select: { id: true, user_id: true },
            });

            if (otherBookings.length > 0) {
              await tx.booking.updateMany({
                where: { id: { in: otherBookings.map((b) => b.id) } },
                data: { status: "EXPIRED" },
              });

              // Send BOOKING_EXPIRED notifications
              await tx.notification.createMany({
                data: otherBookings.map((b) => ({
                  user_id: b.user_id,
                  type: "BOOKING_EXPIRED" as const,
                  message:
                    "Kamar yang Anda pesan telah diambil oleh penyewa lain yang lebih cepat membayar DP.",
                  related_booking_id: b.id,
                })),
              });
            }
          }
        } else if (paymentWithInvoice.invoice.type === "INITIAL") {
          // Legacy INITIAL invoice paid → update invoice PAID + booking APPROVED
          await tx.invoice.update({
            where: { id: paymentWithInvoice.invoice_id },
            data: { status: "PAID" },
          });

          // INITIAL invoice paid → booking APPROVED (awaiting admin check-in)
          await tx.booking.update({
            where: { id: paymentWithInvoice.invoice.booking_id },
            data: { status: "APPROVED" },
          });
        } else {
          // PELUNASAN, EXTENSION, and other types: just mark invoice PAID
          await tx.invoice.update({
            where: { id: paymentWithInvoice.invoice_id },
            data: { status: "PAID" },
          });
          // EXTENSION invoice paid → no booking update, admin must approve via /api/invoices/:id/approve
        }
      });

      console.info(
        `[AUDIT] [${new Date().toISOString()}] Payment settlement diproses | ` +
          `order_id=${order_id} | invoice_id=${paymentWithInvoice.invoice_id} | ` +
          `invoice_type=${paymentWithInvoice.invoice.type}`
      );
      return;
    }

    if (transaction_status === "expire") {
      // Atomic: payment → EXPIRE + invoice status update
      // If invoice.type === INITIAL → reset room unit to AVAILABLE
      // (Requirements 5.7)
      const paymentWithInvoice = await prisma.payment.findUnique({
        where: { id: payment.id },
        select: {
          id: true,
          invoice_id: true,
          invoice: {
            select: {
              id: true,
              type: true,
              booking: {
                select: {
                  id: true,
                  room_unit_id: true,
                },
              },
            },
          },
        },
      });

      if (!paymentWithInvoice) {
        await paymentRepo.updateStatus(payment.id, "EXPIRE");
        return;
      }

      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: "EXPIRE" },
        });

        // For INITIAL invoices: free up the unit when payment expires
        if (paymentWithInvoice.invoice.type === "INITIAL") {
          await tx.roomUnit.update({
            where: { id: paymentWithInvoice.invoice.booking.room_unit_id },
            data: { status: "AVAILABLE" },
          });
        }
      });

      console.info(
        `[AUDIT] [${new Date().toISOString()}] Payment expire diproses | ` +
          `order_id=${order_id} | invoice_id=${paymentWithInvoice.invoice_id}`
      );
      return;
    }

    // Other statuses (e.g., "pending", "capture", "deny", "cancel") —
    // acknowledge receipt but make no database changes
    console.info(
      `[AUDIT] [${new Date().toISOString()}] Webhook status diakui tanpa perubahan data | ` +
        `order_id=${order_id} | status=${transaction_status}`
    );
  },
};
