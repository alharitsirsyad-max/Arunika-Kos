-- =============================================================================
-- Arunika Kos Update Migration
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. New Enum Types
-- -----------------------------------------------------------------------------

CREATE TYPE "AgreementStatus" AS ENUM ('DRAFT', 'CONFIRMED');
CREATE TYPE "RelationshipType" AS ENUM ('ORANG_TUA', 'SAUDARA', 'TEMAN');
CREATE TYPE "NotificationType" AS ENUM ('BOOKING_EXPIRED', 'AGREEMENT_CONFIRMED', 'BOOKING_ACTIVE', 'RENEWAL_REMINDER');

-- -----------------------------------------------------------------------------
-- 2. Update existing enums (add new values)
-- -----------------------------------------------------------------------------

-- BookingStatus: add DP_PENDING, DP_PAID, EXPIRED (keep existing PENDING, APPROVED, ACTIVE, DONE, REJECTED)
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'DP_PENDING';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'DP_PAID';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

-- UnitStatus: add RESERVED (keep existing AVAILABLE, OCCUPIED)
ALTER TYPE "UnitStatus" ADD VALUE IF NOT EXISTS 'RESERVED';

-- InvoiceType: add DP and PELUNASAN (keep existing INITIAL, EXTENSION)
ALTER TYPE "InvoiceType" ADD VALUE IF NOT EXISTS 'DP';
ALTER TYPE "InvoiceType" ADD VALUE IF NOT EXISTS 'PELUNASAN';

-- -----------------------------------------------------------------------------
-- 3. Update "rooms" table — add period_months column
-- -----------------------------------------------------------------------------

ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "period_months" INTEGER NOT NULL DEFAULT 3;

-- -----------------------------------------------------------------------------
-- 4. Update "bookings" table — rename duration_months → duration_periods, add new columns
-- -----------------------------------------------------------------------------

-- Rename the column (if it still exists as duration_months)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'duration_months'
  ) THEN
    ALTER TABLE "bookings" RENAME COLUMN "duration_months" TO "duration_periods";
  END IF;
END $$;

-- Add duration_periods if it doesn't exist yet (in case rename already happened)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'duration_periods'
  ) THEN
    ALTER TABLE "bookings" ADD COLUMN "duration_periods" INTEGER NOT NULL DEFAULT 1;
  END IF;
END $$;

-- Add last_reminder_sent_at column
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "last_reminder_sent_at" TIMESTAMP(3);

-- -----------------------------------------------------------------------------
-- 5. Update "invoices" table — add new columns
-- -----------------------------------------------------------------------------

ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "grace_period_days"  INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "late_fee_per_day"   INTEGER NOT NULL DEFAULT 50000;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "is_late_fee_waived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "receipt_number"     TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "dp_amount"          INTEGER;

-- Add unique constraint on receipt_number
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoices_receipt_number_key'
  ) THEN
    ALTER TABLE "invoices" ADD CONSTRAINT "invoices_receipt_number_key" UNIQUE ("receipt_number");
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 6. Create new table: "agreements"
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "agreements" (
    "id"                TEXT        NOT NULL,
    "booking_id"        TEXT        NOT NULL,
    "room_unit_id"      TEXT        NOT NULL,
    "agreed_start_date" DATE        NOT NULL,
    "agreed_price"      INTEGER     NOT NULL,
    "status"            "AgreementStatus" NOT NULL DEFAULT 'DRAFT',
    "confirmed_by"      TEXT,
    "confirmed_at"      TIMESTAMP(3),
    "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agreements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "agreements_booking_id_key" ON "agreements"("booking_id");

ALTER TABLE "agreements"
    ADD CONSTRAINT "agreements_booking_id_fkey"
        FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "agreements"
    ADD CONSTRAINT "agreements_room_unit_id_fkey"
        FOREIGN KEY ("room_unit_id") REFERENCES "room_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "agreements"
    ADD CONSTRAINT "agreements_confirmed_by_fkey"
        FOREIGN KEY ("confirmed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- 7. Create new table: "invoice_items"
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "invoice_items" (
    "id"          TEXT        NOT NULL,
    "invoice_id"  TEXT        NOT NULL,
    "description" TEXT        NOT NULL,
    "amount"      INTEGER     NOT NULL,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "invoice_items"
    ADD CONSTRAINT "invoice_items_invoice_id_fkey"
        FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- 8. Create new table: "emergency_contacts"
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "emergency_contacts" (
    "id"           TEXT        NOT NULL,
    "user_id"      TEXT        NOT NULL,
    "name"         VARCHAR(100) NOT NULL,
    "relationship" "RelationshipType" NOT NULL,
    "phone_number" TEXT        NOT NULL,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "emergency_contacts_user_id_idx" ON "emergency_contacts"("user_id");

ALTER TABLE "emergency_contacts"
    ADD CONSTRAINT "emergency_contacts_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- 9. Create new table: "notifications"
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "notifications" (
    "id"                 TEXT        NOT NULL,
    "user_id"            TEXT        NOT NULL,
    "type"               "NotificationType" NOT NULL,
    "message"            TEXT        NOT NULL,
    "is_read"            BOOLEAN     NOT NULL DEFAULT false,
    "related_booking_id" TEXT,
    "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "notifications_user_id_is_read_idx"   ON "notifications"("user_id", "is_read");
CREATE INDEX IF NOT EXISTS "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_related_booking_id_fkey"
        FOREIGN KEY ("related_booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
