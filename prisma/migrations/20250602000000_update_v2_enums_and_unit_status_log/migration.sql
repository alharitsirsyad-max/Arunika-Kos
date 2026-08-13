-- =============================================================================
-- Arunika Kos Update v2 Migration
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Update existing enums (add new values)
-- -----------------------------------------------------------------------------

-- BookingStatus: add CANCELLED
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- InvoiceStatus: add REFUND_PENDING and CANCELLED
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'REFUND_PENDING';
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- NotificationType: add RE_VERIFICATION_REQUESTED
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RE_VERIFICATION_REQUESTED';

-- -----------------------------------------------------------------------------
-- 2. Update "users" table — add verification_status column
-- -----------------------------------------------------------------------------

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verification_status" "VerificationStatus" NOT NULL DEFAULT 'PENDING';

-- -----------------------------------------------------------------------------
-- 3. Update "bookings" table — add cancellation_message column
-- -----------------------------------------------------------------------------

ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "cancellation_message" TEXT;

-- -----------------------------------------------------------------------------
-- 4. Create new table: "unit_status_logs"
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "unit_status_logs" (
    "id"          TEXT        NOT NULL,
    "unit_id"     TEXT        NOT NULL,
    "old_status"  "UnitStatus" NOT NULL,
    "new_status"  "UnitStatus" NOT NULL,
    "changed_by"  TEXT        NOT NULL,
    "changed_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note"        TEXT,

    CONSTRAINT "unit_status_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "unit_status_logs_unit_id_idx" ON "unit_status_logs"("unit_id");
CREATE INDEX IF NOT EXISTS "unit_status_logs_changed_by_idx" ON "unit_status_logs"("changed_by");

-- AddForeignKey unit_status_logs -> room_units
ALTER TABLE "unit_status_logs"
    ADD CONSTRAINT "unit_status_logs_unit_id_fkey"
        FOREIGN KEY ("unit_id") REFERENCES "room_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey unit_status_logs -> users
ALTER TABLE "unit_status_logs"
    ADD CONSTRAINT "unit_status_logs_changed_by_fkey"
        FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
