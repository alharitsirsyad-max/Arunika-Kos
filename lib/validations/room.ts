import { z } from "zod";

export const createRoomSchema = z.object({
  name: z
    .string()
    .min(1, "Nama kamar wajib diisi")
    .max(100, "Nama kamar maksimal 100 karakter"),
  price: z
    .number({ error: "Harga harus berupa angka" })
    .int("Harga harus bilangan bulat")
    .min(1, "Harga minimal Rp 1")
    .max(999_999_999, "Harga maksimal Rp 999.999.999"),
  period_months: z
    .number({ error: "Periode harus berupa angka" })
    .int("Periode harus bilangan bulat")
    .min(1, "Periode minimal 1 bulan")
    .max(24, "Periode maksimal 24 bulan"),
  description: z
    .string()
    .min(1, "Deskripsi wajib diisi")
    .max(2000, "Deskripsi maksimal 2000 karakter"),
  facilities: z
    .array(z.string().max(100))
    .min(1, "Fasilitas wajib diisi")
    .max(20, "Maksimal 20 fasilitas"),
  capacity: z
    .number({ error: "Kapasitas harus berupa angka" })
    .int()
    .min(1, "Kapasitas minimal 1"),
});

export const updateRoomSchema = createRoomSchema.partial();

export const createRoomUnitSchema = z.object({
  room_number: z
    .string()
    .min(1, "Nomor kamar wajib diisi")
    .max(10, "Nomor kamar maksimal 10 karakter"),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type CreateRoomUnitInput = z.infer<typeof createRoomUnitSchema>;

export const updateUnitStatusSchema = z.object({
  newStatus: z.enum(["AVAILABLE", "RESERVED", "OCCUPIED"], {
    error: "Status unit tidak valid",
  }),
  note: z.string().max(500, "Catatan maksimal 500 karakter").optional(),
});

export type UpdateUnitStatusInput = z.infer<typeof updateUnitStatusSchema>;
