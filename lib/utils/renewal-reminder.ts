/**
 * Fungsi utilitas untuk menentukan apakah reminder perpanjangan sewa perlu dikirim.
 * Requirements: 7.3 — kirim jika remaining_days ≤ 30 DAN > 0, dan belum ada reminder dalam 7 hari terakhir
 */

import type { BookingStatus, AgreementStatus } from "@prisma/client";

/**
 * Tipe Booking yang mencakup relasi Agreement dan Room yang diperlukan
 * untuk kalkulasi reminder perpanjangan sewa.
 */
export type BookingWithAgreement = {
  status: BookingStatus;
  duration_periods: number;
  last_reminder_sent_at: Date | null;
  agreement: {
    status: AgreementStatus;
    agreed_start_date: Date;
  } | null;
  room_unit: {
    room: {
      period_months: number;
    };
  };
};

/**
 * Menambahkan sejumlah bulan ke tanggal yang diberikan.
 * Menangani kasus bulan akhir (end-of-month clamping).
 *
 * @param date - Tanggal awal
 * @param months - Jumlah bulan yang ditambahkan
 * @returns Tanggal baru setelah penambahan
 */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Menghitung selisih hari antara dua tanggal (date2 - date1).
 * Hanya menghitung hari penuh; mengabaikan komponen waktu.
 *
 * @param date1 - Tanggal awal (dikurangkan dari)
 * @param date2 - Tanggal akhir
 * @returns Selisih dalam hari (bisa negatif jika date2 < date1)
 */
function differenceInDays(date1: Date, date2: Date): number {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const d1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return Math.round((d2 - d1) / MS_PER_DAY);
}

/**
 * Menentukan apakah reminder perpanjangan sewa perlu dikirim untuk booking tertentu.
 *
 * Kondisi pengiriman reminder (Req 7.3):
 * 1. Booking berstatus ACTIVE
 * 2. Agreement ada dan berstatus CONFIRMED
 * 3. remaining_days ≤ 30 DAN remaining_days > 0
 *    (dihitung: end_date = agreed_start_date + duration_periods × period_months bulan)
 * 4. Belum ada reminder dalam 7 hari terakhir (last_reminder_sent_at)
 *
 * @param booking - Data booking beserta relasi agreement dan room
 * @param today - Tanggal hari ini (digunakan sebagai acuan perhitungan)
 * @returns `true` jika reminder perlu dikirim, `false` jika tidak
 *
 * @example
 * // Booking berakhir dalam 15 hari, belum pernah dikirimi reminder
 * shouldSendReminder(booking, today) // true
 *
 * // Booking berakhir dalam 45 hari (lebih dari 30)
 * shouldSendReminder(booking, today) // false
 *
 * // Reminder terakhir dikirim 3 hari lalu (belum 7 hari)
 * shouldSendReminder(booking, today) // false
 */
export function shouldSendReminder(
  booking: BookingWithAgreement,
  today: Date
): boolean {
  // Booking harus ACTIVE dengan Agreement CONFIRMED
  if (booking.status !== "ACTIVE") return false;
  if (!booking.agreement || booking.agreement.status !== "CONFIRMED") {
    return false;
  }

  const { agreed_start_date } = booking.agreement;
  const totalMonths =
    booking.duration_periods * booking.room_unit.room.period_months;

  // Hitung end_date: agreed_start_date + (duration_periods × period_months bulan)
  const endDate = addMonths(agreed_start_date, totalMonths);

  // Hitung sisa hari: end_date - today
  const remainingDays = differenceInDays(today, endDate);

  // Kondisi: sisa hari harus dalam rentang (0, 30]
  if (remainingDays <= 0 || remainingDays > 30) return false;

  // Cek throttle: tidak boleh ada reminder dalam 7 hari terakhir
  if (booking.last_reminder_sent_at !== null) {
    const daysSinceLastReminder = differenceInDays(
      booking.last_reminder_sent_at,
      today
    );
    if (daysSinceLastReminder < 7) return false;
  }

  return true;
}
