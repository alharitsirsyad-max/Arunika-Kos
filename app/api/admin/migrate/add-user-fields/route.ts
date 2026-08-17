import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiResponse } from "@/lib/utils/apiResponse";

/**
 * POST /api/admin/migrate/add-user-fields
 * Tambah field: address, is_blocked, blocked_reason, blocked_at ke tabel users.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-migrate-secret");
  if (secret !== process.env.AUTH_SECRET) {
    return apiResponse.error("Unauthorized", 401, "UNAUTHORIZED");
  }

  const results: string[] = [];

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "address" TEXT
    `);
    results.push("✅ Kolom address ditambahkan");

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_blocked" BOOLEAN NOT NULL DEFAULT false
    `);
    results.push("✅ Kolom is_blocked ditambahkan");

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "blocked_reason" TEXT
    `);
    results.push("✅ Kolom blocked_reason ditambahkan");

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "blocked_at" TIMESTAMP(3)
    `);
    results.push("✅ Kolom blocked_at ditambahkan");

    return apiResponse.success({ results }, "Migrasi berhasil!");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return apiResponse.error(`Migrasi gagal: ${message}`, 500, "MIGRATION_FAILED");
  }
}
