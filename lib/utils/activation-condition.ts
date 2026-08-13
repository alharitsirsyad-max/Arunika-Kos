import type { BookingStatus, AgreementStatus } from "@prisma/client";

/**
 * Tipe Booking minimal yang diperlukan untuk pengecekan kondisi aktivasi.
 * Harus mencakup status booking dan relasi Agreement.
 */
export type BookingForActivation = {
  status: BookingStatus;
  agreement: {
    status: AgreementStatus;
    agreed_start_date: Date;
  } | null;
};

/**
 * Menentukan apakah sebuah booking memenuhi syarat untuk diaktifkan.
 *
 * Ketiga kondisi berikut harus terpenuhi (Req 9.2):
 * 1. Status booking adalah `DP_PAID`
 * 2. Agreement terkait berstatus `CONFIRMED`
 * 3. `agreed_start_date` ≤ tanggal hari ini (`today`)
 *
 * @param booking - Data booking beserta relasi agreement
 * @param today - Tanggal hari ini sebagai acuan (biasanya `startOfDay(new Date())`)
 * @returns `true` jika ketiga kondisi terpenuhi, `false` jika salah satu tidak terpenuhi
 *
 * @example
 * // Booking DP_PAID, agreement CONFIRMED, tanggal masuk sudah lewat
 * shouldActivateBooking(booking, today) // true
 *
 * // Booking DP_PAID, agreement CONFIRMED, tanggal masuk besok
 * shouldActivateBooking(booking, today) // false
 *
 * // Booking masih PENDING
 * shouldActivateBooking(booking, today) // false
 */
export function shouldActivateBooking(
  booking: BookingForActivation,
  today: Date
): boolean {
  // Kondisi 1: status harus DP_PAID
  if (booking.status !== "DP_PAID") return false;

  // Kondisi 2: Agreement harus ada dan CONFIRMED
  if (!booking.agreement || booking.agreement.status !== "CONFIRMED") {
    return false;
  }

  // Kondisi 3: agreed_start_date harus ≤ today
  const agreedStartDate = new Date(booking.agreement.agreed_start_date);
  // Bandingkan hanya tanggal (abaikan komponen waktu)
  const startOfAgreedDate = new Date(
    agreedStartDate.getFullYear(),
    agreedStartDate.getMonth(),
    agreedStartDate.getDate()
  );
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  return startOfAgreedDate <= startOfToday;
}
