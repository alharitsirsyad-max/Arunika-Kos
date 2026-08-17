-- AlterTable
ALTER TABLE "otp_codes" ADD COLUMN "attempt_count" INTEGER NOT NULL DEFAULT 0;
