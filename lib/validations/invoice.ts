import { z } from "zod";

/**
 * Schema for marking an invoice as paid with receipt number (POST /api/admin/invoices/:id/mark-paid).
 */
export const markInvoicePaidSchema = z.object({
  receipt_number: z.string().optional(),
});

export type MarkInvoicePaidInput = z.infer<typeof markInvoicePaidSchema>;
