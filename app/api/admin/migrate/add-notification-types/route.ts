import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiResponse } from "@/lib/utils/apiResponse";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-migrate-secret");
  if (secret !== process.env.AUTH_SECRET) {
    return apiResponse.error("Unauthorized", 401, "UNAUTHORIZED");
  }

  const results: string[] = [];
  const newTypes = [
    "BOOKING_PENDING", "PAYMENT_RECEIVED", "REPORT_SUBMITTED",
    "BOOKING_CANCELLED", "IDENTITY_VERIFIED", "IDENTITY_REJECTED",
    "BOOKING_APPROVED", "BOOKING_REJECTED", "EXTENSION_APPROVED",
    "EXTENSION_REJECTED", "ACCOUNT_BLOCKED"
  ];

  try {
    for (const type of newTypes) {
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS '${type}'`
        );
        results.push(`✅ ${type} ditambahkan`);
      } catch (e) {
        results.push(`⚠️ ${type}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    return apiResponse.success({ results }, "Migrasi NotificationType selesai");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return apiResponse.error(`Migrasi gagal: ${message}`, 500, "MIGRATION_FAILED");
  }
}
