/**
 * Fungsi utilitas kalkulasi denda keterlambatan pembayaran.
 * Requirements: 5.2 (kalkulasi hari terlambat), 5.4 (pengecualian denda waived)
 */

/**
 * Subset minimal dari model Invoice yang diperlukan untuk kalkulasi denda.
 * Sesuai dengan Prisma model Invoice di schema.prisma.
 */
export interface LateFeeInvoice {
  due_date: Date;
  grace_period_days: number;
  late_fee_per_day: number;
  is_late_fee_waived: boolean;
  status: string;
}

/**
 * Hasil kalkulasi denda keterlambatan.
 */
export interface LateFeeResult {
  /** Jumlah hari keterlambatan setelah grace period (selalu >= 0) */
  daysOverdue: number;
  /** Total denda dalam Rupiah (daysOverdue × late_fee_per_day) */
  totalLateFee: number;
  /** Apakah denda dikecualikan (is_late_fee_waived) */
  isWaived: boolean;
}

/**
 * Mengembalikan awal hari (midnight) dari tanggal yang diberikan,
 * tanpa mengubah timezone. Setara dengan date-fns `startOfDay`.
 */
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Menghitung selisih hari antara dua tanggal (dateLeft - dateRight),
 * dibulatkan ke bawah. Setara dengan date-fns `differenceInDays`.
 *
 * @returns Selisih hari (bisa negatif jika dateLeft < dateRight)
 */
function differenceInDays(dateLeft: Date, dateRight: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((dateLeft.getTime() - dateRight.getTime()) / msPerDay);
}

/**
 * Menghitung denda keterlambatan pembayaran untuk sebuah invoice.
 *
 * Formula:
 * - rawDaysLate = differenceInDays(today, due_date)
 * - daysOverdue = max(0, rawDaysLate - grace_period_days)
 * - totalLateFee = daysOverdue × late_fee_per_day
 *
 * Mengembalikan zero values jika:
 * - `is_late_fee_waived === true` (Req 5.4)
 * - `status === "PAID"` (tidak ada denda untuk invoice lunas)
 *
 * @param invoice - Invoice yang akan dikalkulasi dendanya
 * @returns Hasil kalkulasi: daysOverdue, totalLateFee, isWaived
 */
export function calculateLateFee(invoice: LateFeeInvoice): LateFeeResult {
  // Req 5.4: jika denda dikecualikan atau invoice sudah lunas, return zero values
  if (invoice.is_late_fee_waived || invoice.status === "PAID") {
    return {
      daysOverdue: 0,
      totalLateFee: 0,
      isWaived: invoice.is_late_fee_waived,
    };
  }

  const today = startOfDay(new Date());
  const dueDate = startOfDay(invoice.due_date);

  // Req 5.2: hitung hari terlambat = max(0, today - due_date - grace_period_days)
  const rawDaysLate = differenceInDays(today, dueDate);
  const daysOverdue = Math.max(0, rawDaysLate - invoice.grace_period_days);

  return {
    daysOverdue,
    totalLateFee: daysOverdue * invoice.late_fee_per_day,
    isWaived: false,
  };
}
