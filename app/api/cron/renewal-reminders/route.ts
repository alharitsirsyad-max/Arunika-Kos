/**
 * POST /api/cron/renewal-reminders
 *
 * Cron job yang dijalankan setiap hari pukul 07:00 WIB (0 0 * * * UTC).
 * Mengirim reminder perpanjangan sewa kepada penghuni yang masa sewanya
 * akan berakhir dalam ≤ 30 hari.
 *
 * Kondisi pengiriman reminder:
 *   1. Booking berstatus ACTIVE
 *   2. Agreement terkait berstatus CONFIRMED
 *   3. remaining_days ≤ 30 DAN > 0
 *   4. Belum ada reminder dalam 7 hari terakhir (cek last_reminder_sent_at)
 *
 * Setelah kirim: update last_reminder_sent_at dan kirim email jika email_verified.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import { startOfDay, addMonths, differenceInDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { sendRenewalReminderEmail } from "@/lib/email/renewal-reminder";

export async function POST(request: Request) {
  // Validasi Authorization header dengan CRON_SECRET
  const auth = request.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = startOfDay(new Date());
  let remindersSent = 0;
  let skipped = 0;
  let errors = 0;

  // Query semua Booking ACTIVE dengan Agreement CONFIRMED
  const activeBookings = await prisma.booking.findMany({
    where: {
      status: "ACTIVE",
      agreement: { status: "CONFIRMED" },
    },
    include: {
      agreement: true,
      user: true,
      room_unit: {
        include: { room: true },
      },
    },
  });

  for (const booking of activeBookings) {
    try {
      const { agreed_start_date } = booking.agreement!;
      const { duration_periods } = booking;
      const periodMonths = booking.room_unit.room.period_months;

      // Hitung end_date: agreed_start_date + (duration_periods × period_months bulan)
      const endDate = addMonths(agreed_start_date, duration_periods * periodMonths);
      const remainingDays = differenceInDays(endDate, today);

      // Lewati jika di luar window reminder (> 30 hari atau sudah lewat)
      if (remainingDays <= 0 || remainingDays > 30) {
        skipped++;
        continue;
      }

      // Lewati jika sudah ada reminder dalam 7 hari terakhir
      const lastReminder = booking.last_reminder_sent_at;
      if (lastReminder && differenceInDays(today, lastReminder) < 7) {
        skipped++;
        continue;
      }

      // Transaksi: buat notifikasi dan update last_reminder_sent_at
      await prisma.$transaction(async (tx) => {
        await tx.notification.create({
          data: {
            user_id: booking.user_id,
            type: "RENEWAL_REMINDER",
            message: `Masa sewa kamar ${booking.room_unit.room_number} Anda akan berakhir dalam ${remainingDays} hari (${endDate.toLocaleDateString("id-ID")}). Segera ajukan perpanjangan.`,
            related_booking_id: booking.id,
          },
        });

        await tx.booking.update({
          where: { id: booking.id },
          data: { last_reminder_sent_at: today },
        });
      });

      // Kirim email jika user sudah verified — gunakan integrasi Brevo yang sudah ada
      if (booking.user.email_verified) {
        await sendRenewalReminderEmail(booking.user.email, {
          roomNumber: booking.room_unit.room_number,
          endDate,
          remainingDays,
        });
      }

      remindersSent++;
    } catch (err) {
      console.error(`[CRON] Gagal kirim reminder untuk booking ${booking.id}:`, err);
      errors++;
    }
  }

  return Response.json({ reminders_sent: remindersSent, skipped, errors });
}
