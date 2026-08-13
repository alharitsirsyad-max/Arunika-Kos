import { z } from "zod";

export const createReviewSchema = z.object({
  booking_id: z.string().uuid("ID booking tidak valid"),
  rating: z
    .number({ error: "Rating harus berupa angka" })
    .int()
    .min(1, "Rating minimal 1")
    .max(5, "Rating maksimal 5"),
  comment: z
    .string()
    .min(10, "Komentar minimal 10 karakter")
    .max(500, "Komentar maksimal 500 karakter"),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
