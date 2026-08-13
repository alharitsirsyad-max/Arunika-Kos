import type { Payment, PaymentStatus } from "@prisma/client";

/**
 * Input type for creating a Midtrans Snap payment token.
 */
export type CreatePaymentInput = {
  booking_id: string;
};

/**
 * Payload received from Midtrans webhook notifications.
 * See: https://docs.midtrans.com/reference/notification-object
 */
export type MidtransNotificationPayload = {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  payment_type: string;
  transaction_time: string;
  transaction_id: string;
  merchant_id: string;
  currency?: string;
  fraud_status?: string;
  settlement_time?: string;
  expiry_time?: string;
  payment_amounts?: {
    paid_at: string;
    amount: string;
  }[];
};

/**
 * Response returned to the client after creating a Snap payment token.
 */
export type SnapTokenResponse = {
  token: string;
  redirect_url: string;
};

// Re-export Prisma types for convenience
export type { Payment, PaymentStatus };
