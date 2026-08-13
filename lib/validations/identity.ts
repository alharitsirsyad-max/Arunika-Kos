import { z } from "zod";

/**
 * Schema for uploading an identity document (POST /api/identity-documents).
 * document_url is the Cloudinary URL — validated after upload, before DB insert.
 */
export const uploadIdentityDocumentSchema = z.object({
  document_type: z.enum(["KTP", "KARTU_PELAJAR", "KK"], {
    error: "Tipe dokumen tidak valid. Gunakan KTP, KARTU_PELAJAR, atau KK",
  }),
  document_url: z.string().url("URL dokumen tidak valid"),
});

/**
 * Schema for verifying an identity document (PATCH /api/identity-documents/:id/verify).
 * Admin only.
 */
export const verifyIdentityDocumentSchema = z.object({
  verification_status: z.enum(["VERIFIED", "REJECTED"], {
    error: "Status verifikasi tidak valid. Gunakan VERIFIED atau REJECTED",
  }),
});

export type UploadIdentityDocumentInput = z.infer<
  typeof uploadIdentityDocumentSchema
>;
export type VerifyIdentityDocumentInput = z.infer<
  typeof verifyIdentityDocumentSchema
>;

// ---------------------------------------------------------------------------
// Frontend validation schemas (used in client-side React Hook Form)
// ---------------------------------------------------------------------------

/**
 * Frontend schema for uploading an identity document.
 * Validates a native File object — checks MIME type and file size (max 5 MB).
 * Note: z.instanceof(File) only works in browser environments.
 */
export const uploadIdentitySchema = z.object({
  document_type: z.enum(["KTP", "KARTU_PELAJAR", "KK"], {
    message: "Pilih jenis dokumen",
  }),
  file: z
    .instanceof(File)
    .refine((f) => f.size <= 5 * 1024 * 1024, "Ukuran file maksimal 5MB")
    .refine(
      (f) => ["image/jpeg", "image/png"].includes(f.type),
      "Hanya file JPEG dan PNG yang diterima"
    ),
});

export type UploadIdentityFrontendInput = z.infer<typeof uploadIdentitySchema>;
