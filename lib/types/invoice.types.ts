import type { Invoice, InvoiceType, InvoiceStatus } from "@prisma/client";

/**
 * Data required to create a new invoice record.
 */
export type CreateInvoiceData = {
  booking_id: string;
  type: InvoiceType;
  extra_duration_months?: number;
  amount: number;
  due_date: Date;
};

/**
 * Public-facing invoice data returned to clients.
 * Excludes internal relational fields not needed on the client.
 */
export type InvoicePublic = {
  id: string;
  type: InvoiceType;
  extra_duration_months: number | null;
  amount: number;
  due_date: Date;
  status: InvoiceStatus;
  created_at: Date;
};

// Re-export Prisma types for convenience
export type { Invoice, InvoiceType, InvoiceStatus };
