import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import { generateReceiptFromTemplate } from "@/lib/services/receipt-template.service";
import { generateReceiptNumber } from "@/lib/utils/receipt-number";
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors/AppError";

type Params = { params: Promise<{ id: string }> };

const INVOICE_TYPE_LABELS: Record<string, string> = {
  INITIAL: "Pembayaran Sewa",
  DP: "Uang Muka (DP) Sewa Kamar",
  PELUNASAN: "Pelunasan Sewa Kamar",
  EXTENSION: "Perpanjangan Sewa Kamar",
};

/** Format Rupiah tanpa spasi, misal: Rp3.900.000,00 */
function formatRupiahKwitansi(amount: number): string {
  return `Rp${amount.toLocaleString("id-ID", { minimumFractionDigits: 2 })}`;
}

/** Buat teks untuk_pembayaran_1 sesuai format baku kwitansi */
function buildPembayaran1(type: string, roomNumber: string, amount: number): string {
  const label = INVOICE_TYPE_LABELS[type] ?? `Pembayaran ${type}`;
  return `${label} Kamar ${roomNumber} (${formatRupiahKwitansi(amount)})`;
}

const BULAN_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/**
 * Format periode sewa, misal: "Agustus – Oktober 2026"
 * startDate = tanggal mulai, durationMonths = jumlah bulan sewa.
 */
function formatPeriode(startDate: Date, durationMonths: number): string {
  const start = new Date(startDate);
  const end = new Date(startDate);
  end.setMonth(end.getMonth() + durationMonths - 1);

  const startBulan = BULAN_ID[start.getMonth()];
  const endBulan = BULAN_ID[end.getMonth()];
  const endTahun = end.getFullYear();

  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${startBulan} ${endTahun}`;
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `${startBulan} – ${endBulan} ${endTahun}`;
  }
  return `${startBulan} ${start.getFullYear()} – ${endBulan} ${endTahun}`;
}

/**
 * Hitung tanggal pembayaran berikutnya = start_date + durationMonths bulan
 * misal: "1 November 2026"
 */
function hitungTanggalBerikutnya(startDate: Date, durationMonths: number): string {
  const next = new Date(startDate);
  next.setMonth(next.getMonth() + durationMonths);
  return next.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * GET /api/admin/invoices/:id/receipt
 * Generate dan download PDF kwitansi untuk invoice yang sudah PAID (admin).
 * Menggunakan template PDF statis + pdf-lib untuk menempelkan teks.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id: invoiceId } = await params;

  try {
    const session = await auth();
    if (!session) throw new UnauthorizedError("Belum login");
    if ((session.user as { role: string }).role !== "ADMIN") {
      throw new ForbiddenError("Hanya admin yang dapat mencetak kwitansi", "FORBIDDEN");
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        type: true,
        amount: true,
        status: true,
        receipt_number: true,
        created_at: true,
        extra_duration_months: true,
        booking: {
          select: {
            start_date: true,
            duration_periods: true,
            user: { select: { name: true } },
            room_unit: { select: { room_number: true } },
          },
        },
      },
    });

    if (!invoice) throw new NotFoundError(`Invoice ${invoiceId} tidak ditemukan`);

    if (invoice.status !== "PAID") {
      throw new ValidationError(
        "Kwitansi hanya tersedia untuk invoice yang sudah lunas",
        "INVOICE_NOT_PAID"
      );
    }

    // Generate receipt_number jika belum ada
    let receiptNumber = invoice.receipt_number;
    if (!receiptNumber) {
      receiptNumber = await prisma.$transaction(async (tx) => {
        const num = await generateReceiptNumber(tx);
        await tx.invoice.update({ where: { id: invoiceId }, data: { receipt_number: num } });
        return num;
      });
    }

    const tanggal = new Date(invoice.created_at).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const tanggalMasuk = new Date(invoice.booking.start_date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const durationMonths = invoice.extra_duration_months ?? invoice.booking.duration_periods;
    const periode = formatPeriode(invoice.booking.start_date, durationMonths);
    const tanggalBerikutnya = hitungTanggalBerikutnya(
      invoice.booking.start_date,
      durationMonths
    );

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await generateReceiptFromTemplate({
        nomor_kwitansi: receiptNumber,
        tanggal,
        nama: invoice.booking.user.name,
        nomor_kamar: invoice.booking.room_unit.room_number,
        tanggal_masuk: tanggalMasuk,
        jumlah: invoice.amount,
        untuk_pembayaran_1: buildPembayaran1(invoice.type, invoice.booking.room_unit.room_number, invoice.amount),
        untuk_pembayaran_2: `Periode Sewa: ${periode}`,
        tanggal_berikutnya: tanggalBerikutnya,
      });
    } catch (pdfError) {
      console.error("[PDF Generation Error]", pdfError);
      return apiResponse.error("Gagal menggenerate PDF kwitansi", 500, "PDF_GENERATION_ERROR");
    }

    const safeReceiptNumber = receiptNumber.replace(/\//g, "-");
    const filename = `Kwitansi-${safeReceiptNumber}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
