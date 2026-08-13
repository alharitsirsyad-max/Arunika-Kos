import { NextRequest, NextResponse } from "next/server";
import { paymentService } from "@/lib/services/payment.service";
import type { MidtransNotificationPayload } from "@/lib/types/payment.types";

/**
 * POST /api/payments/notification — webhook notifikasi dari Midtrans
 *
 * - Tidak memerlukan autentikasi (request dari Midtrans, bukan pengguna)
 * - Extract IP dari headers untuk security logging (Req 14.3)
 * - Panggil paymentService.handleWebhookNotification(payload, ip)
 * - Selalu return HTTP 200 agar Midtrans tidak mengirim ulang (Req 5.2)
 *
 * Requirements: 5.1–5.5, 11.1–11.6, 14.3, 17.3
 */
export async function POST(req: NextRequest) {
  // Extract client IP for security logging (Req 14.3)
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  try {
    const payload = (await req.json()) as MidtransNotificationPayload;

    await paymentService.handleWebhookNotification(payload, ip);

    // Always return HTTP 200 — Midtrans retries on any non-2xx response.
    // The service layer handles all error states internally. (Req 5.2)
    return NextResponse.json({ success: true, data: null, message: "OK" });
  } catch {
    // Even on unexpected errors, return HTTP 200 to prevent Midtrans retries.
    // Errors are logged inside the service layer.
    return NextResponse.json({ success: true, data: null, message: "OK" });
  }
}
