import { z } from "zod";

// ---------------------------------------------------------------------------
// Backend validation schemas (strict — used in API route handlers)
// ---------------------------------------------------------------------------

export const createBookingSchema = z.object({
  room_id: z.string().min(1, "ID kamar tidak boleh kosong"),
  start_date: z
    .string()
    .refine(
      (val) => {
        const date = new Date(val);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date >= today;
      },
      { message: "Tanggal mulai tidak boleh di masa lalu" }
    ),
  duration_periods: z
    .number({ error: "Durasi harus berupa angka" })
    .int("Durasi harus bilangan bulat")
    .min(1, "Durasi minimal 1 periode")
    .max(24, "Durasi maksimal 24 periode"),
});

export const updateBookingStatusSchema = z.object({
  status: z.enum(["DP_PENDING", "REJECTED"], {
    error: "Status tidak valid",
  }),
  admin_note: z.string().max(500, "Pesan maksimal 500 karakter").optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;

// ---------------------------------------------------------------------------
// Frontend validation schemas (used in client-side React Hook Form)
// ---------------------------------------------------------------------------

/**
 * Frontend schema for creating a booking.
 * Uses duration_periods (1–24) matching the updated period-based pricing model.
 * Skips past-date check (server enforces the date constraint).
 */
export const createBookingSchemaFrontend = z.object({
  room_id: z.string().min(1),
  start_date: z.string().min(1, "Tanggal mulai harus diisi"),
  duration_periods: z
    .number()
    .int()
    .min(1, "Durasi minimal 1 periode")
    .max(24, "Durasi maksimal 24 periode"),
});

/**
 * Frontend schema for extending a booking.
 * Validates 1–12 months (integer).
 */
export const extendBookingSchema = z.object({
  extra_duration_months: z
    .number()
    .int()
    .min(1, "Minimal 1 bulan")
    .max(12, "Maksimal 12 bulan"),
});

export type CreateBookingFrontendInput = z.infer<
  typeof createBookingSchemaFrontend
>;
export type ExtendBookingInput = z.infer<typeof extendBookingSchema>;

// ---------------------------------------------------------------------------
// Cancel booking schema
// ---------------------------------------------------------------------------

export const cancelBookingSchema = z.object({
  cancellationMessage: z
    .string()
    .max(500, "Pesan pembatalan maksimal 500 karakter")
    .optional(),
});

export type CancelBookingSchema = z.infer<typeof cancelBookingSchema>;
