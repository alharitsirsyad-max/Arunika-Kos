import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiResponse } from "@/lib/utils/apiResponse";

/**
 * POST /api/admin/migrate/extension-request
 * Buat tabel extension_requests dan enum ExtensionRequestStatus.
 * Jalankan sekali, lalu abaikan.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-migrate-secret");
  if (secret !== process.env.AUTH_SECRET) {
    return apiResponse.error("Unauthorized", 401, "UNAUTHORIZED");
  }

  const results: string[] = [];

  try {
    // 1. Buat enum ExtensionRequestStatus
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "ExtensionRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    results.push("✅ Enum ExtensionRequestStatus dibuat");

    // 2. Buat tabel extension_requests
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "extension_requests" (
        "id"          TEXT NOT NULL,
        "booking_id"  TEXT NOT NULL,
        "extra_months" INTEGER NOT NULL,
        "status"      "ExtensionRequestStatus" NOT NULL DEFAULT 'PENDING',
        "admin_note"  TEXT,
        "reviewed_by" TEXT,
        "reviewed_at" TIMESTAMP(3),
        "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "extension_requests_pkey" PRIMARY KEY ("id")
      );
    `);
    results.push("✅ Tabel extension_requests dibuat");

    // 3. Buat foreign key ke bookings
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "extension_requests"
          ADD CONSTRAINT "extension_requests_booking_id_fkey"
          FOREIGN KEY ("booking_id") REFERENCES "bookings"("id")
          ON DELETE RESTRICT ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    results.push("✅ FK ke bookings ditambahkan");

    // 4. Buat foreign key ke users (reviewed_by)
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "extension_requests"
          ADD CONSTRAINT "extension_requests_reviewed_by_fkey"
          FOREIGN KEY ("reviewed_by") REFERENCES "users"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    results.push("✅ FK reviewed_by ke users ditambahkan");

    // 5. Buat index
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "extension_requests_booking_id_idx"
        ON "extension_requests"("booking_id");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "extension_requests_status_idx"
        ON "extension_requests"("status");
    `);
    results.push("✅ Index dibuat");

    return apiResponse.success(
      { results, success: true },
      "Migrasi extension_requests berhasil!"
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return apiResponse.error(`Migrasi gagal: ${message}`, 500, "MIGRATION_FAILED");
  }
}
