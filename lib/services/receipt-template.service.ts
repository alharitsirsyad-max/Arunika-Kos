/**
 * lib/services/receipt-template.service.ts
 *
 * Generate kwitansi PDF menggunakan template statis (pdf-lib).
 * Template: public/kwitansi-template.pdf (Arunika Kos - 1 halaman A4)
 *
 * ═══════════════════════════════════════════════════════════════
 * CARA MENGUBAH KOORDINAT:
 * ═══════════════════════════════════════════════════════════════
 * Cari bagian "// ── KOORDINAT FIELD ──" di bawah.
 * x = jarak dari KIRI halaman  (0 = kiri, 612 = kanan)
 * y = jarak dari BAWAH halaman (0 = bawah, 792 = atas)
 *   → pakai  height - N  untuk menghitung dari atas ke bawah
 *
 * Jika teks terlalu ke kiri  → naikkan x
 * Jika teks terlalu ke kanan → turunkan x
 * Jika teks terlalu tinggi   → naikkan  height - N  (kurangi N)
 * Jika teks terlalu rendah   → turunkan height - N  (tambah N)
 * ═══════════════════════════════════════════════════════════════
 *
 * BAGIAN ATAS (header tabel):
 *   nomor_kwitansi  → x: 115,  y: height - 248
 *   tanggal         → x: 440,  y: height - 248
 *   nama            → x: 195,  y: height - 283
 *   nomor_kamar     → x: 195,  y: height - 303
 *   tanggal_masuk   → x: 195,  y: height - 323
 *   jumlah (atas)   → x: 195,  y: height - 343
 *   terbilang (atas)→ x: 195,  y: height - 363
 *   untuk_pembayaran_1 → x: 195,  y: height - 388
 *   untuk_pembayaran_2 → x: 195,  y: height - 408  (opsional)
 *
 * BAGIAN BAWAH (3 kolom):
 *   jumlah_bawah    → x:  88,  y: height - 505
 *   terbilang_bawah → x: 240,  y: height - 505
 *
 * CATATAN:
 *   tanggal_berikutnya → x: 245, y: height - 625
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import path from "path";
import fs from "fs";
// @ts-expect-error — no type declarations for this package
import terbilang from "@develoka/angka-terbilang-js";

// ── Tipe data ─────────────────────────────────────────────────────────────────

export interface ReceiptTemplateData {
  /** Format: Arunika/MM/YYYY/NN */
  nomor_kwitansi: string;
  /** Tanggal pembayaran, misal: "9 Agustus 2026" */
  tanggal: string;
  /** Nama penghuni */
  nama: string;
  /** Nomor unit kamar, misal: "01" */
  nomor_kamar: string;
  /** Tanggal masuk kos, misal: "9 Agustus 2026" */
  tanggal_masuk: string;
  /** Jumlah pembayaran dalam angka */
  jumlah: number;
  /** Keterangan pembayaran (1), misal: "DP Sewa Kamar 01" */
  untuk_pembayaran_1: string;
  /** Keterangan pembayaran (2), misal: "Periode: Agustus – Oktober 2026" (opsional) */
  untuk_pembayaran_2?: string;
  /** Tanggal pembayaran berikutnya, misal: "9 November 2026" (opsional) */
  tanggal_berikutnya?: string;
}

// ── Format helpers ────────────────────────────────────────────────────────────

function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")},-`;
}

function toTerbilang(amount: number): string {
  try {
    const text: string = terbilang(amount);
    return text.charAt(0).toUpperCase() + text.slice(1) + " Rupiah";
  } catch {
    return `${amount} Rupiah`;
  }
}

/**
 * Hitung lebar teks dalam poin — estimasi untuk right-align tanggal.
 * Helvetica average char width ≈ 0.52 × fontSize.
 */
function textWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.52;
}

/**
 * Bungkus teks panjang menjadi array baris berdasarkan maxWidth.
 * Menggunakan font.widthOfTextAtSize() untuk akurasi tepat — tidak ada teks yang terpotong.
 */
import type { PDFFont } from "pdf-lib";
function wrapTextAccurate(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ── Main function ─────────────────────────────────────────────────────────────

export async function generateReceiptFromTemplate(
  data: ReceiptTemplateData
): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), "public", "kwitansi-template.pdf");
  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);

  const page = pdfDoc.getPages()[0];
  const { height } = page.getSize(); // 792 untuk A4 portrait

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const black = rgb(0, 0, 0);

  const terbilangText = toTerbilang(data.jumlah);

  // ── KOORDINAT FIELD ──────────────────────────────────────────────────────────
  // Koordinat awal — sesuaikan setelah melihat hasil preview.
  // Lihat komentar di bagian atas file untuk panduan lengkap.

  // ── Header: Nomor & Tanggal ──────────────────────────────────────────────────

  // "Nomor :"  → nilai nomor kwitansi
  page.drawText(data.nomor_kwitansi, {
    x: 160,           // ← ubah x di sini jika perlu geser kiri/kanan
    y: height - 155,  // ← ubah angka 248 jika perlu geser atas/bawah
    size: 9,
    font,
    color: black,
  });

  // "Tanggal :"  → rata kanan terhadap garis kanan tabel
  // TABEL_KANAN = posisi x garis kanan tabel dalam PDF unit (0–612)
  // Turunkan angka ini jika tanggal masih terlalu jauh ke kanan
  const tanggalSize = 9;
  const TABEL_KANAN = 518; // ← UBAH INI: kurangi jika terlalu jauh kanan, tambah jika kurang kanan
  const tanggalX = TABEL_KANAN - textWidth(data.tanggal, tanggalSize);
  page.drawText(data.tanggal, {
    x: tanggalX,
    y: height - 155,  // ← ubah angka jika perlu geser atas/bawah
    size: tanggalSize,
    font,
    color: black,
  });

  // ── Tabel atas ───────────────────────────────────────────────────────────────

  // "Terima dari :"  → nama penghuni
  page.drawText(data.nama, {
    x: 208,           // ← ubah x di sini
    y: height - 193,  // ← ubah angka 283
    size: 9,
    font,
    color: black,
  });

  // "Nomor Kamar :"  → nomor kamar
  page.drawText(data.nomor_kamar, {
    x: 208,           // ← ubah x di sini
    y: height - 212,  // ← ubah angka 303
    size: 9,
    font,
    color: black,
  });

  // "Tanggal Masuk Kos :"  → tanggal mulai sewa
  page.drawText(data.tanggal_masuk, {
    x: 208,           // ← ubah x di sini
    y: height - 231,  // ← ubah angka 323
    size: 9,
    font,
    color: black,
  });

  // "Jumlah :"  → nominal dalam Rupiah (bold)
  page.drawText(formatRupiah(data.jumlah), {
    x: 208,           // ← ubah x di sini
    y: height - 252,  // ← ubah angka 343
    size: 9,
    font,
    color: black,
  });

  // "Terbilang :"  → terbilang dalam huruf
  page.drawText(terbilangText, {
    x: 208,           // ← ubah x di sini
    y: height - 271,  // ← ubah angka 363
    size: 9,
    font,
    color: black,
  });

  // "Untuk Pembayaran : (1)"  → wrap ke baris bawah jika terlalu panjang
  // PEMBAYARAN_MAX_W = ruang tersedia dari x=223 sampai garis kanan tabel
  const pembayaranFontSize = 9;
  const PEMBAYARAN_X = 223;
  const PEMBAYARAN_MAX_W = 270;  // ← UBAH: lebar area teks untuk_pembayaran (PDF unit)
  const PEMBAYARAN_LINE_H = pembayaranFontSize * 1.5;

  const p1Lines = wrapTextAccurate(data.untuk_pembayaran_1, font, pembayaranFontSize, PEMBAYARAN_MAX_W);
  p1Lines.forEach((line, i) => {
    page.drawText(line, {
      x: PEMBAYARAN_X,
      y: height - 288 - i * PEMBAYARAN_LINE_H,
      size: pembayaranFontSize,
      font,
      color: black,
    });
  });

  // "Untuk Pembayaran : (2)"  → wrap ke baris bawah jika terlalu panjang
  if (data.untuk_pembayaran_2) {
    const p1TotalHeight = p1Lines.length * PEMBAYARAN_LINE_H;
    const p2StartY = height - 284 - p1TotalHeight - 4;

    const p2Lines = wrapTextAccurate(data.untuk_pembayaran_2, font, pembayaranFontSize, PEMBAYARAN_MAX_W);
    p2Lines.forEach((line, i) => {
      page.drawText(line, {
        x: PEMBAYARAN_X,
        y: p2StartY - i * PEMBAYARAN_LINE_H,
        size: pembayaranFontSize,
        font,
        color: black,
      });
    });
  }

  // ── Tabel bawah (3 kolom: Jumlah | Terbilang | Penerima) ─────────────────────

  // Kolom "Jumlah" (kolom kiri)
  page.drawText(formatRupiah(data.jumlah), {
    x: 120,            // ← ubah x di sini
    y: height - 412,  // ← ubah angka 505
    size: 10,
    font: fontBold,
    color: black,
  });

  // Kolom "Terbilang" (kolom tengah) — word-wrap + center dalam kolom
  // Kolom terbilang: dari x=215 sampai x=455 (lebar ~240 PDF unit)
  // Center: hitung x per baris = TERBILANG_X + (TERBILANG_COL_W - textWidth(line)) / 2
  const terbilangFontSize = 10;
  const TERBILANG_X = 170;        // ← x mulai kolom terbilang
  const TERBILANG_COL_W = 240;    // ← lebar total kolom terbilang
  const TERBILANG_MAX_W = 130;    // ← UBAH INI: kurangi jika masih overflow ke kanan
  const TERBILANG_Y_START = height - 412;
  const TERBILANG_LINE_H = terbilangFontSize * 1.4;

  const terbilangLines = wrapTextAccurate(terbilangText, fontBold, terbilangFontSize, TERBILANG_MAX_W);
  terbilangLines.forEach((line, i) => {
    const lineW = fontBold.widthOfTextAtSize(line, terbilangFontSize);
    const centeredX = TERBILANG_X + (TERBILANG_COL_W - lineW) / 2;
    page.drawText(line, {
      x: centeredX,
      y: TERBILANG_Y_START - i * TERBILANG_LINE_H,
      size: terbilangFontSize,
      font: fontBold,
      color: black,
    });
  });

  // ── Catatan bawah ─────────────────────────────────────────────────────────────

  // "1. Pembayaran berikutnya pada tanggal ..."
  if (data.tanggal_berikutnya) {
    page.drawText(data.tanggal_berikutnya, {
      x: 280,           // ← ubah x di sini
      y: height - 533,  // ← ubah angka 625
      size: 9,
      font: fontBold,
      color: black,
    });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
