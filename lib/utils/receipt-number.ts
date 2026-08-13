import { Prisma } from "@prisma/client";

/**
 * Generates a unique receipt number for an invoice.
 *
 * Format: `Arunika/{MM}/{YYYY}/{NN}`
 * - MM   = 2-digit month (e.g. "07")
 * - YYYY = 4-digit year  (e.g. "2026")
 * - NN   = 2-digit sequential number per month, starting from "01"
 *
 * Must be called inside a Prisma transaction to ensure the count is
 * consistent and race-free.
 *
 * Validates: Requirements 8.3
 */
export async function generateReceiptNumber(
  tx: Prisma.TransactionClient
): Promise<string> {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = String(now.getFullYear());

  // Count how many invoices have already received a receipt number this month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  const count = await tx.invoice.count({
    where: {
      receipt_number: { not: null },
      created_at: { gte: startOfMonth, lte: endOfMonth },
    },
  });

  const nn = String(count + 1).padStart(2, "0");
  return `Arunika/${mm}/${yyyy}/${nn}`;
}
