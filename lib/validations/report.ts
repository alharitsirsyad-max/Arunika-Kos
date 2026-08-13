import { z } from "zod";

/**
 * Schema for creating a new report (POST /api/reports).
 */
export const createReportSchema = z.object({
  type: z.enum(["WEBSITE_ISSUE", "ROOM_ISSUE"], {
    error: "Tipe laporan tidak valid",
  }),
  title: z
    .string()
    .min(1, "Judul tidak boleh kosong")
    .max(200, "Judul maksimal 200 karakter"),
  description: z
    .string()
    .min(1, "Deskripsi tidak boleh kosong")
    .max(2000, "Deskripsi maksimal 2000 karakter"),
  image_url: z.string().url("URL gambar tidak valid").optional(),
});

/**
 * Schema for updating a report's status (PATCH /api/reports/:id/status).
 * Admin only — status can only move to IN_PROGRESS or RESOLVED.
 */
export const updateReportStatusSchema = z.object({
  status: z.enum(["IN_PROGRESS", "RESOLVED"], {
    error: "Status tidak valid. Gunakan IN_PROGRESS atau RESOLVED",
  }),
  admin_note: z.string().optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type UpdateReportStatusInput = z.infer<typeof updateReportStatusSchema>;

// ---------------------------------------------------------------------------
// Frontend validation schemas (used in client-side React Hook Form)
// ---------------------------------------------------------------------------

/**
 * Frontend schema for creating a report.
 * No image_url field — frontend form does not support image upload for reports.
 */
export const createReportSchemaFrontend = z.object({
  type: z.enum(["WEBSITE_ISSUE", "ROOM_ISSUE"]),
  title: z
    .string()
    .min(1, "Judul tidak boleh kosong")
    .max(200, "Judul maksimal 200 karakter"),
  description: z
    .string()
    .min(1, "Deskripsi tidak boleh kosong")
    .max(2000, "Deskripsi maksimal 2000 karakter"),
});

export type CreateReportFrontendInput = z.infer<
  typeof createReportSchemaFrontend
>;
