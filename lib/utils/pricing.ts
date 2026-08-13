/**
 * Fungsi utilitas kalkulasi harga untuk sistem Arunika Kos.
 * Requirements: 1.4 (kalkulasi total harga), 1.8 (format tampilan harga kamar)
 */

/**
 * Menghitung total harga booking berdasarkan harga per periode dan jumlah periode.
 *
 * Formula: total_price = price × duration_periods
 *
 * @param price - Harga satu periode dalam Rupiah (integer)
 * @param durationPeriods - Jumlah periode sewa (integer, 1–24)
 * @returns Total harga dalam Rupiah
 */
export function calculateTotalPrice(
  price: number,
  durationPeriods: number
): number {
  return price * durationPeriods;
}

/**
 * Memformat harga kamar untuk ditampilkan di halaman katalog.
 *
 * Format output: "Rp[harga] / [period_months] bulan"
 * Contoh: formatRoomPrice(3900000, 3) → "Rp3.900.000 / 3 bulan"
 *
 * Menggunakan locale Indonesia (id-ID) sehingga pemisah ribuan menggunakan titik.
 *
 * @param price - Harga satu periode dalam Rupiah (integer)
 * @param periodMonths - Jumlah bulan dalam satu periode
 * @returns String harga berformat Indonesia, misalnya "Rp3.900.000 / 3 bulan"
 */
export function formatRoomPrice(price: number, periodMonths: number): string {
  const formattedPrice = price.toLocaleString("id-ID");
  return `Rp${formattedPrice} / ${periodMonths} bulan`;
}
