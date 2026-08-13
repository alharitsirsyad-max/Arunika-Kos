-- Migration: Tambah OTP codes table dan update User table
-- Jalankan manual jika npx prisma db push tidak bisa dijalankan

-- 1. Buat tabel otp_codes
CREATE TABLE IF NOT EXISTS "otp_codes" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- 2. Tambah index
CREATE INDEX IF NOT EXISTS "otp_codes_email_purpose_idx" ON "otp_codes"("email", "purpose");

-- 3. Tambah kolom google_id ke users (jika belum ada)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN NOT NULL DEFAULT false;

-- 4. Buat kolom password dan phone menjadi nullable (jika belum nullable)
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;
ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL;

-- 5. Update user yang sudah ada agar email_verified = true
UPDATE "users" SET "email_verified" = true WHERE "email_verified" = false AND "password" IS NOT NULL;

-- 6. Unique constraint untuk google_id
CREATE UNIQUE INDEX IF NOT EXISTS "users_google_id_key" ON "users"("google_id") WHERE "google_id" IS NOT NULL;
