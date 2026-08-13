/**
 * Fungsi utilitas validasi nomor telepon Indonesia.
 * Requirements: 6.6 — format 08... atau +62..., 10–13 digit angka
 */

/**
 * Memvalidasi nomor telepon Indonesia.
 *
 * Aturan validasi (Req 6.6):
 * - Format `08XXXXXXXXX`: diawali "08", total 10–13 digit angka
 * - Format `+62XXXXXXXXX`: diawali "+62", digit setelah +62 = 9–12 digit (sehingga total angka = 11–14, tetapi hanya dihitung angka setelah kode negara)
 *
 * Penghitungan digit: hanya karakter angka yang dihitung, tidak termasuk `+` dan kode negara `62`.
 * Contoh: "+628123456789" → digits after +62 = "8123456789" = 10 digits → valid (10–13)
 *
 * @param phone - Nomor telepon yang akan divalidasi
 * @returns `true` jika nomor valid, `false` jika tidak
 *
 * @example
 * validateIndonesianPhone("08123456789")   // true  (11 digit, format 08)
 * validateIndonesianPhone("+628123456789") // true  (format +62, 10 digit setelah kode negara)
 * validateIndonesianPhone("0812")          // false (terlalu pendek)
 * validateIndonesianPhone("0812345678901234") // false (terlalu panjang)
 * validateIndonesianPhone("08abc12345")    // false (ada huruf)
 */
export function validateIndonesianPhone(phone: string): boolean {
  if (typeof phone !== "string") return false;

  const trimmed = phone.trim();

  if (trimmed.startsWith("+62")) {
    // Format +62: hapus "+62", hitung digit yang tersisa
    const afterCountryCode = trimmed.slice(3); // bagian setelah "+62"

    // Hanya boleh berisi angka setelah +62
    if (!/^\d+$/.test(afterCountryCode)) return false;

    const digitCount = afterCountryCode.length;
    // 9–12 digit setelah +62 (setara 10–13 digit jika diawali 08)
    return digitCount >= 9 && digitCount <= 12;
  }

  if (trimmed.startsWith("08")) {
    // Format 08: seluruh string harus berupa angka
    if (!/^\d+$/.test(trimmed)) return false;

    const digitCount = trimmed.length;
    // Total 10–13 digit
    return digitCount >= 10 && digitCount <= 13;
  }

  return false;
}
