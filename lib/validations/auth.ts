import { z } from "zod";

// ---------------------------------------------------------------------------
// Backend validation schemas (strict — used in API route handlers)
// ---------------------------------------------------------------------------

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Nama minimal 2 karakter")
    .max(100, "Nama maksimal 100 karakter"),
  email: z
    .string()
    .email("Format email tidak valid")
    .max(254, "Email terlalu panjang"),
  phone: z
    .string()
    .min(10, "Nomor telepon minimal 10 digit")
    .max(15, "Nomor telepon maksimal 15 digit")
    .regex(/^[0-9+\-\s]+$/, "Format nomor telepon tidak valid"),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .max(72, "Password maksimal 72 karakter")
    .regex(/[a-zA-Z]/, "Password harus mengandung minimal satu huruf")
    .regex(/[0-9]/, "Password harus mengandung minimal satu angka"),
});

export const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Frontend validation schemas (used in client-side React Hook Form)
// ---------------------------------------------------------------------------

/**
 * Frontend login schema — validates email format and non-empty password.
 * Intentionally simpler than the backend schema (no complexity rules).
 */
export const loginSchemaFrontend = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Password tidak boleh kosong"),
});

/**
 * Frontend register schema — adds confirmPassword field with equality refinement.
 * Does not enforce password complexity rules (that is the backend's responsibility).
 */
export const registerSchemaFrontend = z
  .object({
    name: z.string().min(1, "Nama tidak boleh kosong"),
    email: z.string().email("Format email tidak valid"),
    password: z.string().min(8, "Password minimal 8 karakter"),
    confirmPassword: z.string(),
    phone: z.string().min(1, "Nomor telepon tidak boleh kosong"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Password tidak cocok",
    path: ["confirmPassword"],
  });

export type LoginFrontendInput = z.infer<typeof loginSchemaFrontend>;
export type RegisterFrontendInput = z.infer<typeof registerSchemaFrontend>;
