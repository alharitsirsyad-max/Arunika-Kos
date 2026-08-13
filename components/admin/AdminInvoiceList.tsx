'use client'

/**
 * components/admin/AdminInvoiceList.tsx
 * Daftar Invoice per booking untuk admin:
 * - Tampilkan tipe, amount, due_date, status, late_fee_summary
 * - InvoiceLateFeeDisplay: hari terlambat, tarif denda, total denda, status waiver
 * - Tombol Waive Denda / Batalkan Waiver jika Invoice overdue dan belum PAID
 * - Tombol Cetak Kwitansi hanya untuk Invoice berstatus PAID
 * Requirements: 5.6, 5.7, 8.2, 8.8, 13.3, 13.5
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle, FileDown, Receipt, ShieldOff, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { apiRequest, ApiError } from '@/lib/api'
import type { InvoiceWithLateFee, InvoiceType, LateFeeSummary } from '@/types/api'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

const INVOICE_TYPE_LABELS: Record<InvoiceType, string> = {
  INITIAL: 'Sewa Awal',
  DP: 'Uang Muka (DP)',
  PELUNASAN: 'Pelunasan',
  EXTENSION: 'Perpanjangan',
}

// ---------------------------------------------------------------------------
// InvoiceLateFeeDisplay sub-component
// ---------------------------------------------------------------------------

interface InvoiceLateFeeDisplayProps {
  invoiceId: string
  lateFee: LateFeeSummary
  lateFeePerDay?: number
  isWaived?: boolean
  status: string
}

export function InvoiceLateFeeDisplay({
  lateFee,
  lateFeePerDay,
  isWaived,
  status,
}: InvoiceLateFeeDisplayProps) {
  // Jika invoice sudah PAID: tampilkan sebagai catatan historis
  if (status === 'PAID') {
    if (lateFee.total_late_fee === 0 && !lateFee.is_waived) return null
    return (
      <div className="rounded-md bg-muted/40 px-3 py-2 text-xs space-y-0.5">
        <p className="font-medium text-muted-foreground">Catatan Denda (Historis)</p>
        {lateFee.is_waived ? (
          <p className="text-green-700">Denda Dikecualikan saat pembayaran</p>
        ) : lateFee.total_late_fee > 0 ? (
          <p>Denda dikenakan: {formatRupiah(lateFee.total_late_fee)}</p>
        ) : null}
      </div>
    )
  }

  // Invoice belum PAID
  if (isWaived) {
    return (
      <div className="flex items-center gap-1.5 rounded-md bg-green-50 border border-green-200 px-2.5 py-1.5 text-xs text-green-800">
        <ShieldCheck className="size-3.5 shrink-0" />
        <span className="font-medium">Denda Dikecualikan</span>
      </div>
    )
  }

  if (!lateFee || lateFee.days_overdue === 0) return null

  return (
    <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 space-y-1 text-xs">
      <div className="flex items-center gap-1.5 text-red-800 font-medium">
        <AlertCircle className="size-3.5 shrink-0" />
        Denda Keterlambatan
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-red-700">
        <span>Hari terlambat:</span>
        <span className="font-medium">{lateFee.days_overdue} hari</span>
        {lateFeePerDay !== undefined && (
          <>
            <span>Tarif per hari:</span>
            <span className="font-medium">{formatRupiah(lateFeePerDay)}</span>
          </>
        )}
        <span>Total denda:</span>
        <span className="font-semibold">{formatRupiah(lateFee.total_late_fee)}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Waive mutation hook (inline)
// ---------------------------------------------------------------------------

function useWaiveLateFee(invoiceId: string) {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: (waive: boolean) =>
      apiRequest<{ id: string; is_late_fee_waived: boolean }>(
        `/api/admin/invoices/${invoiceId}/waive-late-fee`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ waive }),
        }
      ),
    onSuccess: (_, waive) => {
      toast.success(waive ? 'Denda berhasil dikecualikan.' : 'Pengecualian denda dibatalkan.')
      queryClient.invalidateQueries({ queryKey: ['booking'] })
      router.refresh()
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Gagal mengubah status denda.')
    },
  })
}

// ---------------------------------------------------------------------------
// Invoice Card component
// ---------------------------------------------------------------------------

interface InvoiceCardProps {
  invoice: InvoiceWithLateFee
}

function InvoiceCard({ invoice }: InvoiceCardProps) {
  const [downloading, setDownloading] = useState(false)
  const waiveMutation = useWaiveLateFee(invoice.id)

  const isOverdue =
    invoice.status !== 'PAID' &&
    invoice.late_fee_summary != null &&
    invoice.late_fee_summary.days_overdue >= 1

  const handleDownloadReceipt = async () => {
    setDownloading(true)
    try {
      const res = await fetch(`/api/admin/invoices/${invoice.id}/receipt`)
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        toast.error(json?.error?.message ?? 'Gagal mengunduh kwitansi.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kwitansi-${invoice.receipt_number ?? invoice.id}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Gagal mengunduh kwitansi.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className={`rounded-lg border bg-card p-4 space-y-3 ${isOverdue ? 'border-destructive/30' : ''}`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Receipt className="size-3.5 text-muted-foreground" />
            <span className="font-medium text-sm">
              {INVOICE_TYPE_LABELS[invoice.type] ?? invoice.type}
            </span>
          </div>
          {invoice.receipt_number && (
            <p className="text-xs text-muted-foreground pl-5">{invoice.receipt_number}</p>
          )}
        </div>
        <StatusBadge variant="invoice" status={invoice.status} />
      </div>

      {/* Detail grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <span className="text-xs text-muted-foreground block">Jumlah</span>
          <span className="font-medium">{formatRupiah(invoice.amount)}</span>
        </div>
        <div>
          <span className="text-xs text-muted-foreground block">Jatuh Tempo</span>
          <span className={isOverdue ? 'text-destructive font-medium' : ''}>
            {formatDate(invoice.due_date)}
            {isOverdue ? ' ⚠️' : ''}
          </span>
        </div>
      </div>

      {/* Invoice items */}
      {invoice.items && invoice.items.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Rincian</span>
          {invoice.items.map((item) => (
            <div key={item.id} className="flex justify-between text-xs text-muted-foreground">
              <span>{item.description}</span>
              <span>{formatRupiah(item.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Late fee display */}
      {invoice.late_fee_summary && (
        <InvoiceLateFeeDisplay
          invoiceId={invoice.id}
          lateFee={invoice.late_fee_summary}
          lateFeePerDay={invoice.late_fee_per_day}
          isWaived={invoice.is_late_fee_waived}
          status={invoice.status}
        />
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap pt-1">
        {/* Waive / Unwaive button */}
        {invoice.status !== 'PAID' && isOverdue && (
          invoice.is_late_fee_waived ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => waiveMutation.mutate(false)}
              disabled={waiveMutation.isPending}
              className="gap-1.5 text-xs"
            >
              {waiveMutation.isPending ? <LoadingSpinner size="sm" /> : <ShieldOff className="size-3.5" />}
              Batalkan Waiver
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => waiveMutation.mutate(true)}
              disabled={waiveMutation.isPending}
              className="gap-1.5 text-xs text-green-700 border-green-200 hover:bg-green-50"
            >
              {waiveMutation.isPending ? <LoadingSpinner size="sm" /> : <ShieldCheck className="size-3.5" />}
              Waive Denda
            </Button>
          )
        )}

        {/* Cetak Kwitansi — hanya untuk PAID */}
        {invoice.status === 'PAID' && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadReceipt}
            disabled={downloading}
            className="gap-1.5 text-xs"
          >
            {downloading ? <LoadingSpinner size="sm" /> : <FileDown className="size-3.5" />}
            Cetak Kwitansi
          </Button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AdminInvoiceList
// ---------------------------------------------------------------------------

interface AdminInvoiceListProps {
  invoices: InvoiceWithLateFee[]
}

export function AdminInvoiceList({ invoices }: AdminInvoiceListProps) {
  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Receipt className="size-4 text-muted-foreground" />
        <h2 className="font-semibold text-base">Tagihan</h2>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-md border border-dashed py-8 text-center">
          <p className="text-sm text-muted-foreground">Belum ada tagihan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <InvoiceCard key={invoice.id} invoice={invoice} />
          ))}
        </div>
      )}
    </div>
  )
}
