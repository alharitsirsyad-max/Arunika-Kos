import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiResponse } from "@/lib/utils/apiResponse";

/**
 * POST /api/admin/migrate
 * Jalankan migrasi database untuk fitur OTP + Google OAuth.
 * Endpoint sementara — hapus setelah migrasi berhasil.
 *
 * Akses: hanya dengan secret key di header
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-migrate-secret");
  if (secret !== process.env.AUTH_SECRET) {
    return apiResponse.error("Unauthorized", 401, "UNAUTHORIZED");
  }

  const results: string[] = [];

  try {
    // 1. Tambah kolom google_id
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_id" TEXT
    `);
    results.push("✅ Kolom google_id ditambahkan");

    // 2. Tambah kolom email_verified
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN NOT NULL DEFAULT false
    `);
    results.push("✅ Kolom email_verified ditambahkan");

    // 3. Buat kolom password nullable
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL
    `);
    results.push("✅ Kolom password dijadikan nullable");

    // 4. Buat kolom phone nullable
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL
    `);
    results.push("✅ Kolom phone dijadikan nullable");

    // 5. Update user lama agar email_verified = true
    const updated = await prisma.$executeRawUnsafe(`
      UPDATE "users" SET "email_verified" = true WHERE "password" IS NOT NULL
    `);
    results.push(`✅ ${updated} user lama ditandai email_verified`);

    // 6. Buat unique index untuk google_id
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "users_google_id_key" 
      ON "users"("google_id") WHERE "google_id" IS NOT NULL
    `);
    results.push("✅ Unique index google_id dibuat");

    // 7. Buat tabel otp_codes
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "otp_codes" (
        "id" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "code" TEXT NOT NULL,
        "purpose" TEXT NOT NULL,
        "expires_at" TIMESTAMP(3) NOT NULL,
        "used" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
      )
    `);
    results.push("✅ Tabel otp_codes dibuat");

    // 8. Index untuk otp_codes
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "otp_codes_email_purpose_idx" 
      ON "otp_codes"("email", "purpose")
    `);
    results.push("✅ Index otp_codes dibuat");

    return apiResponse.success(
      { results, success: true },
      "Migrasi berhasil! Semua perubahan schema telah diterapkan."
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return apiResponse.error(
      `Migrasi gagal: ${message}`,
      500,
      "MIGRATION_FAILED"
    );
  }
}
