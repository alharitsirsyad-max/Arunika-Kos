import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";

/**
 * Kirim notifikasi ke satu user.
 */
export async function notifyUser(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0] | typeof prisma,
  userId: string,
  type: NotificationType,
  message: string,
  relatedBookingId?: string
) {
  await tx.notification.create({
    data: {
      user_id: userId,
      type,
      message,
      related_booking_id: relatedBookingId ?? null,
    },
  });
}

/**
 * Kirim notifikasi ke semua admin.
 */
export async function notifyAllAdmins(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0] | typeof prisma,
  type: NotificationType,
  message: string,
  relatedBookingId?: string
) {
  const admins = await tx.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  if (admins.length === 0) return;

  await tx.notification.createMany({
    data: admins.map((admin) => ({
      user_id: admin.id,
      type,
      message,
      related_booking_id: relatedBookingId ?? null,
    })),
  });
}
