'use client'

/**
 * components/user/InvoiceLateFeeDisplay.tsx
 * Menampilkan informasi denda keterlambatan pada Invoice di tampilan user.
 *
 * Menangani empat kasus:
 * 1. is_late_fee_waived = true  → tampilkan label "Denda Dikecualikan" saja
 * 2. status === 'PAID' dan total_late_fee > 0  → tampilkan data historis (tanpa kalkulasi ulang)
 * 3. status !== 'PAID' dan days_overdue >= 1  → tampilkan rincian lengkap denda
 * 4. Tidak ada keterlambatan  → return null (tidak tampilkan apa-apa)
 *
 * Requirements: 5.7, 5.8, 14.5
 */

import { ShieldCheck, AlertTriangle, History } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { InvoiceWithLateFee } from '@/types/api'

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n)

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface InvoiceLateFeeDisplayProps {
  invoice: InvoiceWithLateFee
  /** Tampilan kompak (satu baris) untuk tabel; default: false (card/detail view) */
  compact?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InvoiceLateFeeDisplay({
  invoice,
  compact = false,
}: InvoiceLateFeeDisplayProps) {
  const {
    status,
    is_late_fee_waived,
    late_fee_summary,
    late_fee_per_day,
  } = invoice

  // Kasus 1: Denda dikecualikan — tampilkan label saja, tanpa angka
  if (is_late_fee_waived) {
    return (
      <div className="flex items-center gap-1.5">
        <ShieldCheck className="size-4 text-green-600 shrink-0" />
        <Badge
          variant="outline"
          className="bg-green-50 text-green-700 border-green-200 font-medium text-xs"
        >
          Denda Dikecualikan
        </Badge>
      </div>
    )
  }

  const daysOverdue = late_fee_summary?.days_overdue ?? 0
  const totalLateFee = late_fee_summary?.total_late_fee ?? 0

  // Kasus 2: Invoice PAID — tampilkan sebagai catatan historis saja (Requirement 5.8)
  if (status === 'PAID') {
    if (totalLateFee > 0) {
      if (compact) {
        return (
          <span className="text-xs text-muted-foreground">
            {formatRupiah(totalLateFee)}{' '}
            <span className="opacity-70">(historis)</span>
          </span>
        )
      }

      return (
        <div className="flex items-start gap-2 rounded-md border border-muted bg-muted/30 px-3 py-2 text-sm">
          <History className="mt-0.5 size-4 text-muted-foreground shrink-0" />
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-muted-foreground">
              Catatan Denda (saat pembayaran)
            </p>
            <p className="text-sm font-semibold">{formatRupiah(totalLateFee)}</p>
            <p className="text-xs text-muted-foreground">
              {daysOverdue} hari × {formatRupiah(late_fee_per_day ?? 0)} / hari
            </p>
          </div>
        </div>
      )
    }
    // PAID tanpa denda — tidak tampilkan apa-apa
    return null
  }

  // Kasus 3: Invoice belum PAID, ada keterlambatan — tampilkan rincian lengkap (Requirement 5.7)
  if (daysOverdue >= 1) {
    if (compact) {
      return (
        <div className="text-xs">
          <div className="flex items-center gap-1 font-semibold text-destructive">
            <AlertTriangle className="size-3.5 shrink-0" />
            <span>{formatRupiah(totalLateFee)}</span>
          </div>
          <span className="text-muted-foreground">{daysOverdue} hari</span>
        </div>
      )
    }

    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-destructive shrink-0" />
          <span className="text-sm font-semibold text-destructive">Denda Keterlambatan</span>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <dt className="text-muted-foreground">Jumlah hari terlambat</dt>
          <dd className="font-medium text-right">{daysOverdue} hari</dd>

          <dt className="text-muted-foreground">Tarif denda per hari</dt>
          <dd className="font-medium text-right">
            {formatRupiah(late_fee_per_day ?? 0)}
          </dd>

          <dt className="text-muted-foreground font-medium text-destructive">Total denda</dt>
          <dd className="font-semibold text-right text-destructive">
            {formatRupiah(totalLateFee)}
          </dd>
        </dl>
      </div>
    )
  }

  // Kasus 4: Tidak ada keterlambatan — tidak tampilkan apa-apa
  return null
}
