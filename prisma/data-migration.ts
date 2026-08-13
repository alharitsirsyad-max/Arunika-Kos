/**
 * Data Migration Script — Arunika Kos Update
 *
 * Migrations performed:
 * 1. bookings.duration_months → duration_periods (value stays the same,
 *    just interpretation changes; handled by schema migration rename).
 *    This script verifies the rename is complete and fixes any NULL values.
 * 2. invoices.type = 'INITIAL' → 'DP' for all existing records.
 *
 * Run with:
 *   npx tsx prisma/data-migration.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting data migration...\n");

  // ─────────────────────────────────────────────────────────────────────────
  // Migration 1: Verify duration_periods column (was duration_months)
  // The schema migration already renamed the column; this just reports counts.
  // ─────────────────────────────────────────────────────────────────────────
  const bookingCount = await prisma.booking.count();
  const bookingWithPeriods = await prisma.booking.count({
    where: { duration_periods: { gt: 0 } },
  });

  console.log("📋 Migration 1: bookings.duration_periods check");
  console.log(`   Total bookings: ${bookingCount}`);
  console.log(`   Bookings with valid duration_periods (> 0): ${bookingWithPeriods}`);

  if (bookingCount > 0 && bookingWithPeriods === bookingCount) {
    console.log("   ✅ All bookings have valid duration_periods values.\n");
  } else if (bookingCount === 0) {
    console.log("   ℹ️  No bookings in database — nothing to migrate.\n");
  } else {
    // Fix any bookings where duration_periods might be 0 or NULL (shouldn't happen after rename)
    const fixed = await prisma.booking.updateMany({
      where: { duration_periods: { lte: 0 } },
      data: { duration_periods: 1 },
    });
    console.log(`   ⚠️  Fixed ${fixed.count} bookings with invalid duration_periods (set to 1).\n`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Migration 2: Update invoices.type = 'INITIAL' → 'DP'
  // ─────────────────────────────────────────────────────────────────────────
  console.log("📋 Migration 2: invoices.type INITIAL → DP");

  const initialCount = await prisma.invoice.count({
    where: { type: "INITIAL" },
  });
  console.log(`   Found ${initialCount} invoice(s) with type = INITIAL`);

  if (initialCount > 0) {
    const result = await prisma.invoice.updateMany({
      where: { type: "INITIAL" },
      data: { type: "DP" },
    });
    console.log(`   ✅ Updated ${result.count} invoice(s): INITIAL → DP\n`);
  } else {
    console.log("   ℹ️  No invoices with type = INITIAL — nothing to migrate.\n");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Final verification
  // ─────────────────────────────────────────────────────────────────────────
  console.log("🔍 Final verification...");

  const remainingInitial = await prisma.invoice.count({
    where: { type: "INITIAL" },
  });

  if (remainingInitial === 0) {
    console.log("   ✅ No invoices with type = INITIAL remain.");
  } else {
    console.error(`   ❌ ERROR: ${remainingInitial} invoice(s) still have type = INITIAL!`);
    process.exit(1);
  }

  // Verify new tables are accessible
  const agreementCount = await prisma.agreement.count();
  const invoiceItemCount = await prisma.invoiceItem.count();
  const emergencyContactCount = await prisma.emergencyContact.count();
  const notificationCount = await prisma.notification.count();

  console.log("\n📊 New table record counts:");
  console.log(`   agreements:        ${agreementCount}`);
  console.log(`   invoice_items:     ${invoiceItemCount}`);
  console.log(`   emergency_contacts: ${emergencyContactCount}`);
  console.log(`   notifications:     ${notificationCount}`);

  console.log("\n✅ Data migration completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Data migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
