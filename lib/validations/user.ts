import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(1, "Nama wajib diisi")
    .max(100, "Nama maksimal 100 karakter"),
  phone: z
    .string()
    .regex(/^\d{10,15}$/, "Nomor telepon harus 10–15 digit angka"),
  address: z.string().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
