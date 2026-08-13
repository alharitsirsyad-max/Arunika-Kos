import { z } from "zod";

export const createPaymentSchema = z.object({
  booking_id: z.string().uuid("ID booking tidak valid"),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
