-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('INITIAL', 'EXTENSION');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('UNPAID', 'PENDING_VERIFICATION', 'PAID');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('WEBSITE_ISSUE', 'ROOM_ISSUE');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('KTP', 'KARTU_PELAJAR', 'KK');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- AlterTable payments: drop booking_id, add invoice_id
ALTER TABLE "payments" DROP COLUMN IF EXISTS "booking_id";
ALTER TABLE "payments" ADD COLUMN "invoice_id" TEXT NOT NULL;
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_key" UNIQUE ("invoice_id");

-- CreateTable invoices
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "type" "InvoiceType" NOT NULL,
    "extra_duration_months" INTEGER,
    "amount" INTEGER NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'UNPAID',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable reports
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "room_unit_id" TEXT,
    "type" "ReportType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "image_url" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "admin_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable identity_documents
CREATE TABLE "identity_documents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "document_url" TEXT NOT NULL,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reports_user_id_idx" ON "reports"("user_id");
CREATE INDEX "reports_status_idx" ON "reports"("status");
CREATE INDEX "identity_documents_user_id_idx" ON "identity_documents"("user_id");
CREATE INDEX "identity_documents_verification_status_idx" ON "identity_documents"("verification_status");

-- AddForeignKey invoices -> bookings
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey payments -> invoices
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey reports -> users
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey reports -> room_units
ALTER TABLE "reports" ADD CONSTRAINT "reports_room_unit_id_fkey" FOREIGN KEY ("room_unit_id") REFERENCES "room_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey identity_documents -> users (owner)
ALTER TABLE "identity_documents" ADD CONSTRAINT "identity_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey identity_documents -> users (verifier)
ALTER TABLE "identity_documents" ADD CONSTRAINT "identity_documents_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
