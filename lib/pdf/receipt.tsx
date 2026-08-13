/**
 * Template PDF kwitansi menggunakan @react-pdf/renderer.
 * Dirender di sisi server — tidak menggunakan "use client".
 *
 * Requirements: 8.4, 8.5, 8.6
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
// @ts-expect-error — no type declarations for this package
import terbilang from "@develoka/angka-terbilang-js";

// ─── Tipe Data ────────────────────────────────────────────────────────────────

export interface ReceiptItem {
  id: string;
  description: string;
  amount: number;
}

export interface ReceiptData {
  /** Nomor kwitansi, format: Arunika/MM/YYYY/NN */
  receipt_number: string;
  /** Tanggal pembayaran (invoice PAID date) */
  payment_date: Date;
  /** Nama penyewa */
  payer_name: string;
  /** Nomor kamar (room_number) */
  room_number: string;
  /** Tanggal masuk yang disepakati (dari Agreement) */
  agreed_start_date: Date;
  /** Daftar rincian item biaya */
  items: ReceiptItem[];
  /** Total keseluruhan dalam Rupiah */
  total_amount: number;
  /** Tanggal jatuh tempo invoice berikutnya (opsional) */
  next_due_date?: Date | null;
}

// ─── Utility ─────────────────────────────────────────────────────────────────

/**
 * Format angka ke format mata uang Rupiah.
 * Contoh: 3900000 → "Rp 3.900.000"
 */
function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

/**
 * Format tanggal ke format Indonesia.
 * Contoh: "12 Juli 2026"
 */
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Konversi angka ke teks terbilang Bahasa Indonesia.
 * Menggunakan library @develoka/angka-terbilang-js.
 * Contoh: 3900000 → "tiga juta sembilan ratus ribu"
 *
 * Requirements: 8.5
 */
function toTerbilang(amount: number): string {
  try {
    const text: string = terbilang(amount);
    // Capitalize first letter
    return text.charAt(0).toUpperCase() + text.slice(1) + " Rupiah";
  } catch {
    return `${amount} Rupiah`;
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 50,
    backgroundColor: "#FFFFFF",
    color: "#1a1a1a",
  },
  // Header
  header: {
    marginBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: "#2563EB",
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#2563EB",
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 10,
    color: "#6B7280",
  },
  // Kwitansi label
  receiptLabel: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 16,
    color: "#111827",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  // Info section
  infoGrid: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 16,
  },
  infoBlock: {
    flex: 1,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  infoLabel: {
    width: 120,
    color: "#6B7280",
    fontSize: 9,
  },
  infoSeparator: {
    width: 12,
    color: "#6B7280",
    fontSize: 9,
  },
  infoValue: {
    flex: 1,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#111827",
  },
  // Items table
  tableContainer: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 4,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderNo: {
    width: 28,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#374151",
  },
  tableHeaderDesc: {
    flex: 1,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#374151",
  },
  tableHeaderAmount: {
    width: 100,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#374151",
    textAlign: "right",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  tableRowAlt: {
    backgroundColor: "#FAFAFA",
  },
  tableCellNo: {
    width: 28,
    fontSize: 9,
    color: "#6B7280",
  },
  tableCellDesc: {
    flex: 1,
    fontSize: 9,
    color: "#111827",
  },
  tableCellAmount: {
    width: 100,
    fontSize: 9,
    color: "#111827",
    textAlign: "right",
  },
  // Total section
  totalContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 16,
    paddingTop: 8,
  },
  totalBlock: {
    width: 200,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  totalLabel: {
    fontSize: 9,
    color: "#374151",
  },
  totalValue: {
    fontSize: 9,
    color: "#111827",
    fontFamily: "Helvetica-Bold",
  },
  totalDivider: {
    borderTopWidth: 1,
    borderTopColor: "#2563EB",
    marginVertical: 4,
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    borderRadius: 3,
  },
  grandTotalLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#2563EB",
  },
  grandTotalValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#2563EB",
  },
  // Terbilang
  terbilangBox: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 4,
    padding: 8,
    marginBottom: 16,
  },
  terbilangLabel: {
    fontSize: 8,
    color: "#16A34A",
    marginBottom: 2,
  },
  terbilangText: {
    fontSize: 9,
    fontFamily: "Helvetica-BoldOblique",
    color: "#15803D",
  },
  // Next due date note
  noteBox: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 4,
    padding: 8,
    marginBottom: 20,
  },
  noteLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#92400E",
    marginBottom: 2,
  },
  noteText: {
    fontSize: 9,
    color: "#92400E",
  },
  // Footer
  footer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  footerLeft: {
    fontSize: 8,
    color: "#9CA3AF",
  },
  signatureBlock: {
    alignItems: "center",
    width: 140,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: "#D1D5DB",
    width: 120,
    marginTop: 40,
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 8,
    color: "#6B7280",
    textAlign: "center",
  },
  signatureName: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    textAlign: "center",
  },
});

// ─── Komponen ────────────────────────────────────────────────────────────────

/**
 * Komponen PDF kwitansi untuk invoice yang sudah PAID.
 *
 * Elemen wajib (Req 8.4):
 * - Nomor kwitansi
 * - Tanggal pembayaran
 * - Nama penerima
 * - Nomor kamar
 * - Tanggal masuk yang disepakati
 * - Rincian multi-item
 * - Jumlah total
 * - Terbilang (Req 8.5)
 * - Jatuh tempo berikutnya (jika ada)
 */
export function ReceiptDocument({ data }: { data: ReceiptData }) {
  const totalFromItems =
    data.items.length > 0
      ? data.items.reduce((sum, item) => sum + item.amount, 0)
      : data.total_amount;

  return (
    <Document
      title={`Kwitansi ${data.receipt_number}`}
      author="Arunika Kos"
      subject="Kwitansi Pembayaran"
    >
      <Page size="A4" style={styles.page}>
        {/* ── Header ───────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Arunika Kos</Text>
          <Text style={styles.headerSubtitle}>
            Kwitansi Pembayaran Resmi
          </Text>
        </View>

        {/* ── Label Kwitansi ────────────────────────────────────────────── */}
        <Text style={styles.receiptLabel}>Kwitansi</Text>

        {/* ── Info Grid ─────────────────────────────────────────────────── */}
        <View style={styles.infoGrid}>
          <View style={styles.infoBlock}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>No. Kwitansi</Text>
              <Text style={styles.infoSeparator}>:</Text>
              <Text style={styles.infoValue}>{data.receipt_number}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tanggal Pembayaran</Text>
              <Text style={styles.infoSeparator}>:</Text>
              <Text style={styles.infoValue}>
                {formatDate(data.payment_date)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nama Penerima</Text>
              <Text style={styles.infoSeparator}>:</Text>
              <Text style={styles.infoValue}>{data.payer_name}</Text>
            </View>
          </View>

          <View style={styles.infoBlock}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nomor Kamar</Text>
              <Text style={styles.infoSeparator}>:</Text>
              <Text style={styles.infoValue}>{data.room_number}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tanggal Masuk</Text>
              <Text style={styles.infoSeparator}>:</Text>
              <Text style={styles.infoValue}>
                {formatDate(data.agreed_start_date)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Tabel Item ────────────────────────────────────────────────── */}
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderNo}>No</Text>
            <Text style={styles.tableHeaderDesc}>Keterangan</Text>
            <Text style={styles.tableHeaderAmount}>Jumlah</Text>
          </View>

          {data.items.length > 0 ? (
            data.items.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.tableRow,
                  index % 2 === 1 ? styles.tableRowAlt : {},
                ]}
              >
                <Text style={styles.tableCellNo}>{index + 1}</Text>
                <Text style={styles.tableCellDesc}>{item.description}</Text>
                <Text style={styles.tableCellAmount}>
                  {formatRupiah(item.amount)}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.tableRow}>
              <Text style={styles.tableCellNo}>1</Text>
              <Text style={styles.tableCellDesc}>Pembayaran</Text>
              <Text style={styles.tableCellAmount}>
                {formatRupiah(data.total_amount)}
              </Text>
            </View>
          )}
        </View>

        {/* ── Total ─────────────────────────────────────────────────────── */}
        <View style={styles.totalContainer}>
          <View style={styles.totalBlock}>
            <View style={styles.totalDivider} />
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>
                {formatRupiah(totalFromItems)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Terbilang ─────────────────────────────────────────────────── */}
        <View style={styles.terbilangBox}>
          <Text style={styles.terbilangLabel}>Terbilang:</Text>
          <Text style={styles.terbilangText}>
            {toTerbilang(totalFromItems)}
          </Text>
        </View>

        {/* ── Catatan Jatuh Tempo Berikutnya ────────────────────────────── */}
        {data.next_due_date && (
          <View style={styles.noteBox}>
            <Text style={styles.noteLabel}>Informasi Pembayaran Berikutnya</Text>
            <Text style={styles.noteText}>
              Tagihan berikutnya jatuh tempo pada:{" "}
              {formatDate(data.next_due_date)}
            </Text>
          </View>
        )}

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <Text style={styles.footerLeft}>
            Dokumen ini digenerate secara otomatis oleh sistem Arunika Kos.
            {"\n"}
            Dokumen ini sah tanpa tanda tangan basah.
          </Text>

          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Hormat kami,</Text>
            <Text style={styles.signatureName}>Arunika Kos</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
