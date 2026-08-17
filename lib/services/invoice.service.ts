import { prisma } from "@/lib/prisma";
import { invoiceRepo } from "@/lib/repositories/invoice.repo";
import { calculateLateFee } from "@/lib/utils/late-fee";
import { generateReceiptNumber } from "@/lib/utils/receipt-number";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors/AppError";
import type { InvoicePublic } from "@/lib/types/invoice.types";

/**
 * Invoice Service — manages extension invoice creation and approval.
 *
 * IMPORTANT: amount is ALWAYS calculated server-side using room.price × extraMonths.
 * Any amount value from the client is intentionally ignored (Requirement 12.1-12.3).
 */
export const invoiceService = {
  /**
   * Create an EXTENSION invoice for a booking.
   *
   * Steps:
   * 1. Fetch booking with room data (for price calculation).
   * 2. Validate booking.user_id === userId → ForbiddenError (FORBIDDEN).
   * 3. Validate booking.status === 'ACTIVE' → ValidationError (BOOKING_NOT_ACTIVE).
   * 4. Calculate amount = room.price × extraMonths — from DB, not from client.
   * 5. Create invoice with type=EXTENSION, status=UNPAID.
   *
   * Requirements: 2.1–2.8, 12.1–12.3
   */
  async createExtension(
    userId: string,
    bookingId: string,
    extraMonths: number
  ): Promise<InvoicePublic> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        user_id: true,
        status: true,
        room_unit: {
          select: {
            room: {
              select: { price: true },
            },
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundError(`Booking dengan ID ${bookingId} tidak ditemukan`);
    }

    // IDOR check: user can only extend their own booking (Requirement 2.1, 2.5)
    if (booking.user_id !== userId) {
      throw new ForbiddenError(
        "Anda tidak memiliki akses ke booking ini",
        "FORBIDDEN"
      );
    }

    // Only ACTIVE bookings can be extended (Requirement 2.2, 2.6)
    if (booking.status !== "ACTIVE") {
      throw new ValidationError(
        "Perpanjangan hanya dapat dilakukan pada booking yang berstatus ACTIVE",
        "BOOKING_NOT_ACTIVE"
      );
    }

    // Calculate amount server-side — never from client (Requirement 12.1, 12.2, 12.3)
    const amount = booking.room_unit.room.price * extraMonths;

    // Due date: 7 days from now
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    const invoice = await invoiceRepo.create({
      booking_id: bookingId,
      type: "EXTENSION",
      extra_duration_months: extraMonths,
      amount,
      due_date: dueDate,
    });

    return invoice;
  },

  /**
   * Get all invoices belonging to the authenticated user.
   * Includes late_fee_summary computed in real-time.
   */
  async getMyInvoices(userId: string) {
    const invoices = await invoiceRepo.findByUserId(userId);

    return invoices.map((inv) => {
      const lateFeeResult = calculateLateFee({
        due_date: inv.due_date,
        grace_period_days: inv.grace_period_days ?? 3,
        late_fee_per_day: inv.late_fee_per_day ?? 50000,
        is_late_fee_waived: inv.is_late_fee_waived ?? false,
        status: inv.status,
      });

      return {
        ...inv,
        late_fee_summary: {
          days_overdue: lateFeeResult.daysOverdue,
          total_late_fee: lateFeeResult.totalLateFee,
          is_waived: lateFeeResult.isWaived,
        },
      };
    });
  },

  /**
   * Mark an invoice as PAID (admin only).
   *
   * If invoice.type === 'DP', runs a cascade in a single atomic transaction:
   *   1. Update Invoice → PAID (with generated receipt_number)
   *   2. Update Booking.status → DP_PAID
   *   3. Update RoomUnit.status → RESERVED
   *   4. Expire all competing PENDING/DP_PENDING bookings on the same unit
   *   5. Send BOOKING_EXPIRED notifications to affected users
   *
   * For all other invoice types, simply marks the invoice as PAID
   * and generates a receipt_number if one doesn't exist yet.
   *
   * Idempotent: throws ConflictError if invoice is already PAID.
   *
   * Requirements: 4.1, 4.2, 4.6
   */
  async markInvoicePaid(invoiceId: string): Promise<{ invoice_id: string; status: string }> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        booking: {
          select: {
            id: true,
            status: true,
            user_id: true,
            room_unit_id: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundError(`Invoice ${invoiceId} tidak ditemukan`);
    }

    // Idempotency: jika sudah PAID, tolak
    if (invoice.status === "PAID") {
      throw new ConflictError("Invoice ini sudah berstatus PAID", "ALREADY_PAID");
    }

    if (invoice.type === "DP") {
      // Cascade atomik untuk invoice DP
      await prisma.$transaction(async (tx) => {
        // 1. Generate receipt number dan tandai invoice PAID
        const receiptNumber = await generateReceiptNumber(tx);
        await tx.invoice.update({
          where: { id: invoiceId },
          data: { status: "PAID", receipt_number: receiptNumber },
        });

        // Ambil start_date booking untuk cek apakah perlu langsung aktif
        const bookingData = await tx.booking.findUnique({
          where: { id: invoice.booking.id },
          select: { start_date: true, total_price: true, room_unit_id: true },
        });

        const now = new Date();
        const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const startDate = bookingData?.start_date ?? new Date(0);
        const startDateUTC = new Date(Date.UTC(
          startDate.getUTCFullYear(),
          startDate.getUTCMonth(),
          startDate.getUTCDate()
        ));
        const startDateReached = startDateUTC <= todayUTC;

        if (startDateReached) {
          // Tanggal mulai sudah tiba → langsung ACTIVE + OCCUPIED
          await tx.booking.update({
            where: { id: invoice.booking.id },
            data: { status: "ACTIVE" },
          });
          await tx.roomUnit.update({
            where: { id: invoice.booking.room_unit_id },
            data: { status: "OCCUPIED" },
          });
          await tx.notification.create({
            data: {
              user_id: invoice.booking.user_id,
              type: "BOOKING_ACTIVE",
              message: "Status sewa Anda kini AKTIF. Kamar resmi menjadi hak Anda.",
              related_booking_id: invoice.booking.id,
            },
          });
        } else {
          // Tanggal mulai belum tiba → DP_PAID + RESERVED, tunggu cron
          await tx.booking.update({
            where: { id: invoice.booking.id },
            data: { status: "DP_PAID" },
          });
          await tx.roomUnit.update({
            where: { id: invoice.booking.room_unit_id },
            data: { status: "RESERVED" },
          });
        }

        // Buat Agreement otomatis sebagai catatan
        const existingAgreement = await tx.agreement.findFirst({
          where: { booking_id: invoice.booking.id },
        });
        if (!existingAgreement && bookingData) {
          await tx.agreement.create({
            data: {
              booking_id: invoice.booking.id,
              room_unit_id: bookingData.room_unit_id,
              agreed_start_date: bookingData.start_date,
              agreed_price: bookingData.total_price,
              status: "CONFIRMED",
              confirmed_at: new Date(),
            },
          });
        }

        // Expire semua booking PENDING/DP_PENDING lain pada unit yang sama
        const otherBookings = await tx.booking.findMany({
          where: {
            room_unit_id: invoice.booking.room_unit_id,
            id: { not: invoice.booking.id },
            status: { in: ["PENDING", "DP_PENDING"] },
          },
          select: { id: true, user_id: true },
        });

        // Notifikasi ke semua admin — pembayaran DP diterima
        const adminsForPayment = await tx.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
        if (adminsForPayment.length > 0) {
          await tx.notification.createMany({
            data: adminsForPayment.map((admin) => ({
              user_id: admin.id,
              type: "PAYMENT_RECEIVED" as const,
              message: `Pembayaran DP dari user telah diterima untuk booking ID ${invoice.booking.id}.`,
              related_booking_id: invoice.booking.id,
            })),
          });
        }

        if (otherBookings.length > 0) {
          await tx.booking.updateMany({
            where: { id: { in: otherBookings.map((b) => b.id) } },
            data: { status: "EXPIRED" },
          });
          await tx.notification.createMany({
            data: otherBookings.map((b) => ({
              user_id: b.user_id,
              type: "BOOKING_EXPIRED" as const,
              message: "Kamar yang Anda pesan telah diambil oleh penyewa lain yang lebih cepat membayar DP.",
              related_booking_id: b.id,
            })),
          });
        }
      });
    } else {
      // Untuk tipe lain (PELUNASAN, EXTENSION, dll): cukup tandai PAID
      await prisma.$transaction(async (tx) => {
        const receiptNumber =
          invoice.receipt_number ?? (await generateReceiptNumber(tx));

        await tx.invoice.update({
          where: { id: invoiceId },
          data: { status: "PAID", receipt_number: receiptNumber },
        });
      });
    }

    return { invoice_id: invoiceId, status: "PAID" };
  },

  /**
   * Generate PDF receipt for a user-owned PAID invoice.
   *
   * Steps:
   * 1. Fetch invoice dengan relasi booking (user, room_unit→room, agreement) + invoice_items
   * 2. Jika tidak ada → NotFoundError
   * 3. Validasi ownership: invoice.booking.user_id !== userId → ForbiddenError('RECEIPT_UNAUTHORIZED')
   * 4. Validasi status: invoice.status !== 'PAID' → ValidationError('INVOICE_NOT_PAID')
   * 5. Generate receipt_number jika belum ada (dalam transaction)
   * 6. Bangun ReceiptData dan render PDF
   *
   * Requirements: 9.2, 9.3, 9.4, 9.5, 9.6
   */
  async generateUserReceipt(userId: string, invoiceId: string): Promise<Buffer> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        amount: true,
        type: true,
        status: true,
        receipt_number: true,
        created_at: true,
        extra_duration_months: true,
        booking: {
          select: {
            user_id: true,
            start_date: true,
            duration_periods: true,
            user: {
              select: { name: true },
            },
            room_unit: {
              select: {
                room_number: true,
                room: { select: { period_months: true } },
              },
            },
            agreement: {
              select: { agreed_start_date: true },
            },
          },
        },
        items: {
          select: {
            id: true,
            description: true,
            amount: true,
          },
        },
      },
    });

    // 2. Not found check
    if (!invoice) {
      throw new NotFoundError(`Invoice dengan ID ${invoiceId} tidak ditemukan`);
    }

    // 3. Ownership check (IDOR protection) — Requirement 9.4
    if (invoice.booking.user_id !== userId) {
      throw new ForbiddenError(
        "Anda tidak memiliki akses ke kwitansi ini",
        "RECEIPT_UNAUTHORIZED"
      );
    }

    // 4. Status check — hanya invoice PAID yang bisa di-download — Requirement 9.5
    if (invoice.status !== "PAID") {
      throw new ValidationError(
        "Kwitansi hanya tersedia untuk invoice yang sudah berstatus PAID",
        "INVOICE_NOT_PAID"
      );
    }

    // 5. Generate receipt_number jika belum ada
    let receiptNumber = invoice.receipt_number;
    if (!receiptNumber) {
      receiptNumber = await prisma.$transaction(async (tx) => {
        const newNumber = await generateReceiptNumber(tx);
        await tx.invoice.update({
          where: { id: invoiceId },
          data: { receipt_number: newNumber },
        });
        return newNumber;
      });
    }

    // 6. Bangun ReceiptTemplateData dan generate PDF dari template
    const { generateReceiptFromTemplate } = await import("@/lib/services/receipt-template.service");

    const INVOICE_TYPE_LABELS: Record<string, string> = {
      INITIAL: "Pembayaran Sewa",
      DP: "Uang Muka (DP) Sewa Kamar",
      PELUNASAN: "Pelunasan Sewa Kamar",
      EXTENSION: "Perpanjangan Sewa Kamar",
    };

    const formatRupiahKwitansi = (amount: number) =>
      `Rp${amount.toLocaleString("id-ID", { minimumFractionDigits: 2 })}`;

    const label = INVOICE_TYPE_LABELS[invoice.type] ?? `Pembayaran ${invoice.type}`;
    const pembayaran1 = `${label} Kamar ${invoice.booking.room_unit.room_number} (${formatRupiahKwitansi(invoice.amount)})`;

    const tanggal = new Date(invoice.created_at).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Gunakan agreed_start_date jika ada, fallback ke start_date booking
    const startDate =
      invoice.booking.agreement?.agreed_start_date ?? invoice.booking.start_date;
    const tanggalMasuk = new Date(startDate).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const BULAN_ID = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    ];

    // Untuk DP: 1 periode × period_months = total bulan
    // Untuk EXTENSION: extra_duration_months bulan
    const periodMonths = invoice.booking.room_unit.room.period_months ?? 3;
    const durationMonths = invoice.type === "DP"
      ? periodMonths  // DP = 1 periode penuh
      : (invoice.extra_duration_months ?? invoice.booking.duration_periods);

    // Format periode sebagai daftar bulan: "Agustus, September, Oktober 2026"
    const formatPeriode = (startDate: Date, totalBulan: number): string => {
      const bulanList: string[] = [];
      let tahunAkhir = startDate.getFullYear();
      for (let i = 0; i < totalBulan; i++) {
        const d = new Date(startDate);
        d.setMonth(d.getMonth() + i);
        bulanList.push(BULAN_ID[d.getMonth()]);
        tahunAkhir = d.getFullYear();
      }
      return `${bulanList.join(", ")} ${tahunAkhir}`;
    };

    // Tanggal berikutnya = start + period_months (1 periode penuh)
    const hitungTanggalBerikutnya = (startDate: Date, totalBulan: number): string => {
      const next = new Date(startDate);
      next.setMonth(next.getMonth() + totalBulan);
      return next.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    };

    const periode = formatPeriode(startDate, durationMonths);
    const tanggalBerikutnya = hitungTanggalBerikutnya(startDate, durationMonths);

    const buffer = await generateReceiptFromTemplate({
      nomor_kwitansi: receiptNumber,
      tanggal,
      nama: invoice.booking.user.name,
      nomor_kamar: invoice.booking.room_unit.room_number,
      tanggal_masuk: tanggalMasuk,
      jumlah: invoice.amount,
      untuk_pembayaran_1: pembayaran1,
      untuk_pembayaran_2: `Periode Sewa: ${periode}`,
      tanggal_berikutnya: tanggalBerikutnya,
    });

    return buffer;
  },

  /**
   * Approve an EXTENSION invoice (admin only).
   *
   * Validates:
   * - invoice.type === 'EXTENSION'
   * - invoice.status === 'PAID' → ValidationError (INVOICE_NOT_PAID)
   *
   * On success: adds extra_duration_months to booking.duration_months in a transaction.
   *
   * Requirements: 4.1–4.7
   */
  async approveExtension(invoiceId: string) {
    const invoice = await invoiceRepo.findById(invoiceId);

    if (!invoice) {
      throw new NotFoundError(`Invoice dengan ID ${invoiceId} tidak ditemukan`);
    }

    if (invoice.type !== "EXTENSION") {
      throw new ValidationError(
        "Hanya invoice bertipe EXTENSION yang dapat disetujui melalui endpoint ini",
        "VALIDATION_ERROR"
      );
    }

    // Invoice must be PAID before admin can approve (Requirement 4.2, 4.6)
    if (invoice.status !== "PAID") {
      throw new ValidationError(
        "Invoice harus berstatus PAID sebelum perpanjangan dapat disetujui",
        "INVOICE_NOT_PAID"
      );
    }

    // Atomic transaction: add extra periods to booking duration (Requirement 4.3, 4.4)
    const updatedBooking = await prisma.$transaction(async (tx) => {
      return tx.booking.update({
        where: { id: invoice.booking_id },
        data: {
          duration_periods: {
            increment: invoice.extra_duration_months ?? 0,
          },
        },
        select: {
          id: true,
          user_id: true,
          room_unit_id: true,
          start_date: true,
          duration_periods: true,
          total_price: true,
          status: true,
          created_at: true,
        },
      });
    });

    return updatedBooking;
  },
};
