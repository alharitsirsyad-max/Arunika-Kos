'use client'

/**
 * components/admin/AdminInvoiceTable.tsx
 * Tabel semua invoice untuk admin — lihat status pembayaran, setujui perpanjangan.
 *
 * Fitur baru (Task 15.1):
 * - Kolom "Denda": tampilkan jumlah denda aktif jika berlaku
 * - Tombol "Waive Denda": untuk Invoice overdue, belum PAID, is_late_fee_waived = false
 * - Indikator "Denda Dikecualikan": jika is_late_fee_waived = true
 * - Tombol "Cetak Kwitansi": hanya untuk Invoice berstatus PAID
 *
 * Requirements: 8.8, 13.3, 13.5
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { RefreshCwIcon, FileDown, ShieldCheck, ShieldOff, AlertCircle } from 'lucide-react'
import {
  useAdminInvoices,
  useCheckExpiredBookings,
  useMarkInvoicePaid,
  useWaiveAdminLateFee,
  type AdminInvoice,
} from '@/hooks/useAdminInvoices'
import { useApproveInvoice } from '@/hooks/useInvoices'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { ClickableUserName } from '@/components/admin/ClickableUserName'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'

const INVOICE_TYPE_LABELS: Record<string, string> = {
  INITIAL: 'Sewa Awal',
  DP: 'Uang Muka (DP)',
  PELUNASAN: 'Pelunasan',
  EXTENSION: 'Perpanjangan',
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Menunggu',
  SETTLEMENT: 'Lunas',
  EXPIRE: 'Kadaluarsa',
  CANCEL: 'Dibatalkan',
}

// ---------------------------------------------------------------------------
// Filter tabs
// ---------------------------------------------------------------------------

type FilterTab = 'all' | 'UNPAID' | 'PAID' | 'EXTENSION'

// ---------------------------------------------------------------------------
// AdminInvoiceTable (main export)
// ---------------------------------------------------------------------------

export function AdminInvoiceTable() {
  const { data: invoices, isLoading, isError, error, refetch } = useAdminInvoices()
  const checkExpired = useCheckExpiredBookings()
  const markPaid = useMarkInvoicePaid()
  const waiveMutation = useWaiveAdminLateFee()
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null)
  const [waivedId, setWaivedId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const approve = useApproveInvoice(approvingId ?? '')
  const [tab, setTab] = useState<FilterTab>('all')

  const handleApprove = async (id: string) => {
    setApprovingId(id)
    try {
      await approve.mutateAsync()
      toast.success('Perpanjangan disetujui.')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menyetujui.')
    } finally {
      setApprovingId(null)
    }
  }

  const handleMarkPaid = async (id: string) => {
    setMarkingPaidId(id)
    try {
      await markPaid.mutateAsync(id)
      toast.success('Invoice ditandai sebagai Lunas.')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menandai lunas.')
    } finally {
      setMarkingPaidId(null)
    }
  }

  const handleWaive = async (invoiceId: string, waive: boolean) => {
    setWaivedId(invoiceId)
    try {
      await waiveMutation.mutateAsync({ invoiceId, waive })
      toast.success(waive ? 'Denda berhasil dikecualikan.' : 'Pengecualian denda dibatalkan.')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal mengubah status denda.')
    } finally {
      setWaivedId(null)
    }
  }

  const handleDownloadReceipt = async (inv: AdminInvoice) => {
    setDownloadingId(inv.id)
    try {
      const res = await fetch(`/api/admin/invoices/${inv.id}/receipt`)
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        toast.error(json?.error?.message ?? 'Gagal mengunduh kwitansi.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kwitansi-${inv.receipt_number ?? inv.id}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Gagal mengunduh kwitansi.')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleCheckExpired = async () => {
    try {
      const result = await checkExpired.mutateAsync()
      toast.success(`${(result as { renewal_invoices_created: number }).renewal_invoices_created} invoice perpanjangan dibuat.`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal cek expired.')
    }
  }

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
  if (isError) return <ErrorMessage message={error instanceof ApiError ? error.message : 'Gagal memuat invoice.'} onRetry={() => refetch()} />

  const all = invoices ?? []

  const filtered = all.filter((inv) => {
    if (tab === 'UNPAID') return inv.status === 'UNPAID'
    if (tab === 'PAID') return inv.status === 'PAID'
    if (tab === 'EXTENSION') return inv.type === 'EXTENSION' && inv.status === 'PAID'
    return true
  })

  const tabCounts = {
    all: all.length,
    UNPAID: all.filter((i) => i.status === 'UNPAID').length,
    PAID: all.filter((i) => i.status === 'PAID').length,
    EXTENSION: all.filter((i) => i.type === 'EXTENSION' && i.status === 'PAID').length,
  }

  // ── Toolbar ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Filter tabs */}
        <div className="flex gap-1 flex-wrap">
          {([['all', 'Semua'], ['UNPAID', 'Belum Bayar'], ['PAID', 'Lunas'], ['EXTENSION', 'Perlu Disetujui']] as [FilterTab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                tab === key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {label} ({tabCounts[key]})
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleCheckExpired} disabled={checkExpired.isPending}>
            {checkExpired.isPending ? <LoadingSpinner size="sm" /> : <RefreshCwIcon className="size-3.5" />}
            Cek Durasi Habis
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">Tidak ada data.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kamar</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Jenis</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Jumlah</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Jatuh Tempo</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Denda</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Pembayaran</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <InvoiceRow
                    key={inv.id}
                    invoice={inv}
                    onApprove={handleApprove}
                    onMarkPaid={handleMarkPaid}
                    onWaive={handleWaive}
                    onDownloadReceipt={handleDownloadReceipt}
                    isApproving={approvingId === inv.id && approve.isPending}
                    isMarkingPaid={markingPaidId === inv.id && markPaid.isPending}
                    isWaiving={waivedId === inv.id && waiveMutation.isPending}
                    isDownloading={downloadingId === inv.id}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((inv) => (
              <InvoiceCard
                key={inv.id}
                invoice={inv}
                onApprove={handleApprove}
                onMarkPaid={handleMarkPaid}
                onWaive={handleWaive}
                onDownloadReceipt={handleDownloadReceipt}
                isApproving={approvingId === inv.id && approve.isPending}
                isMarkingPaid={markingPaidId === inv.id && markPaid.isPending}
                isWaiving={waivedId === inv.id && waiveMutation.isPending}
                isDownloading={downloadingId === inv.id}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Late fee display cell
// ---------------------------------------------------------------------------

interface LateFeeDisplayProps {
  invoice: AdminInvoice
}

function LateFeeCell({ invoice }: LateFeeDisplayProps) {
  const { late_fee_summary, is_late_fee_waived, status } = invoice

  if (status === 'PAID') {
    // Tampilkan data historis saja
    if (late_fee_summary.total_late_fee > 0) {
      return (
        <span className="text-xs text-muted-foreground">
          {formatRupiah(late_fee_summary.total_late_fee)}
          <span className="block text-muted-foreground/70">(historis)</span>
        </span>
      )
    }
    return <span className="text-xs text-muted-foreground">-</span>
  }

  if (is_late_fee_waived) {
    return (
      <div className="flex items-center gap-1 text-xs text-green-700 font-medium">
        <ShieldCheck className="size-3.5 shrink-0" />
        <span>Dikecualikan</span>
      </div>
    )
  }

  if (late_fee_summary.days_overdue >= 1) {
    return (
      <div className="text-xs">
        <div className="flex items-center gap-1 text-destructive font-medium">
          <AlertCircle className="size-3.5 shrink-0" />
          <span>{formatRupiah(late_fee_summary.total_late_fee)}</span>
        </div>
        <span className="text-muted-foreground">{late_fee_summary.days_overdue} hari</span>
      </div>
    )
  }

  return <span className="text-xs text-muted-foreground">-</span>
}

// ---------------------------------------------------------------------------
// Row & Card shared props
// ---------------------------------------------------------------------------

interface InvProps {
  invoice: AdminInvoice
  onApprove: (id: string) => void
  onMarkPaid: (id: string) => void
  onWaive: (id: string, waive: boolean) => void
  onDownloadReceipt: (inv: AdminInvoice) => void
  isApproving: boolean
  isMarkingPaid: boolean
  isWaiving: boolean
  isDownloading: boolean
}

// ---------------------------------------------------------------------------
// Row (Desktop)
// ---------------------------------------------------------------------------

function InvoiceRow({ invoice, onApprove, onMarkPaid, onWaive, onDownloadReceipt, isApproving, isMarkingPaid, isWaiving, isDownloading }: InvProps) {
  const isOverdue =
    invoice.status !== 'PAID' &&
    invoice.late_fee_summary.days_overdue >= 1

  return (
    <tr className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${isOverdue ? 'bg-red-50/30' : ''}`}>
      <td className="px-4 py-3">
        <ClickableUserName userId={invoice.booking.user.id} name={invoice.booking.user.name} className="text-sm font-medium" />
        <p className="text-xs text-muted-foreground">{invoice.booking.user.email}</p>
      </td>
      <td className="px-4 py-3 text-sm">{invoice.booking.room_unit.room.name} ({invoice.booking.room_unit.room_number})</td>
      <td className="px-4 py-3 text-sm">{INVOICE_TYPE_LABELS[invoice.type] ?? invoice.type}</td>
      <td className="px-4 py-3 text-sm font-medium">{formatRupiah(invoice.amount)}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        <span className={isOverdue ? 'text-destructive font-medium' : ''}>
          {formatDate(invoice.due_date)}
          {isOverdue && ' ⚠️'}
        </span>
      </td>
      <td className="px-4 py-3">
        <LateFeeCell invoice={invoice} />
      </td>
      <td className="px-4 py-3">
        <StatusBadge variant="invoice" status={invoice.status} />
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {invoice.payment ? (
          <div>
            <span className={`font-medium ${invoice.payment.status === 'SETTLEMENT' ? 'text-green-600' : ''}`}>
              {PAYMENT_STATUS_LABELS[invoice.payment.status] ?? invoice.payment.status}
            </span>
            {invoice.payment.paid_at && <p>{formatDate(invoice.payment.paid_at)}</p>}
          </div>
        ) : '-'}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1.5 flex-wrap items-center">
          {/* Tandai Lunas */}
          {invoice.status === 'UNPAID' && (
            <Button size="sm" variant="outline" onClick={() => onMarkPaid(invoice.id)} disabled={isMarkingPaid}>
              {isMarkingPaid ? <LoadingSpinner size="sm" /> : 'Tandai Lunas'}
            </Button>
          )}
          {/* Setujui Perpanjangan */}
          {invoice.type === 'EXTENSION' && invoice.status === 'PAID' && (
            <Button size="sm" onClick={() => onApprove(invoice.id)} disabled={isApproving}>
              {isApproving ? <LoadingSpinner size="sm" /> : 'Setujui'}
            </Button>
          )}
          {/* Waive Denda / Batalkan Waiver — Req 13.5 */}
          {invoice.status !== 'PAID' && isOverdue && (
            invoice.is_late_fee_waived ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onWaive(invoice.id, false)}
                disabled={isWaiving}
                className="gap-1 text-xs"
                title="Batalkan pengecualian denda"
              >
                {isWaiving ? <LoadingSpinner size="sm" /> : <ShieldOff className="size-3.5" />}
                <span className="hidden lg:inline">Batalkan Waiver</span>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onWaive(invoice.id, true)}
                disabled={isWaiving}
                className="gap-1 text-xs text-green-700 border-green-300 hover:bg-green-50"
                title="Kecualikan denda keterlambatan"
              >
                {isWaiving ? <LoadingSpinner size="sm" /> : <ShieldCheck className="size-3.5" />}
                <span className="hidden lg:inline">Waive Denda</span>
              </Button>
            )
          )}
          {/* Cetak Kwitansi — Req 8.8, 13.3: hanya untuk PAID */}
          {invoice.status === 'PAID' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDownloadReceipt(invoice)}
              disabled={isDownloading}
              className="gap-1 text-xs"
              title="Unduh kwitansi PDF"
            >
              {isDownloading ? <LoadingSpinner size="sm" /> : <FileDown className="size-3.5" />}
              <span className="hidden lg:inline">Kwitansi</span>
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Card (Mobile)
// ---------------------------------------------------------------------------

function InvoiceCard({ invoice, onApprove, onMarkPaid, onWaive, onDownloadReceipt, isApproving, isMarkingPaid, isWaiving, isDownloading }: InvProps) {
  const isOverdue =
    invoice.status !== 'PAID' &&
    invoice.late_fee_summary.days_overdue >= 1

  return (
    <div className={`rounded-lg border bg-card p-4 space-y-3 ${isOverdue ? 'border-destructive/30' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <ClickableUserName userId={invoice.booking.user.id} name={invoice.booking.user.name} className="font-medium text-sm" />
          <p className="text-xs text-muted-foreground">{invoice.booking.room_unit.room.name} ({invoice.booking.room_unit.room_number})</p>
        </div>
        <StatusBadge variant="invoice" status={invoice.status} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-xs text-muted-foreground block">Jenis</span>
          {INVOICE_TYPE_LABELS[invoice.type] ?? invoice.type}
        </div>
        <div>
          <span className="text-xs text-muted-foreground block">Jumlah</span>
          {formatRupiah(invoice.amount)}
        </div>
        <div>
          <span className="text-xs text-muted-foreground block">Jatuh Tempo</span>
          <span className={isOverdue ? 'text-destructive' : ''}>{formatDate(invoice.due_date)}</span>
        </div>
        <div>
          <span className="text-xs text-muted-foreground block">Pembayaran</span>
          {invoice.payment ? PAYMENT_STATUS_LABELS[invoice.payment.status] ?? invoice.payment.status : '-'}
        </div>
        <div className="col-span-2">
          <span className="text-xs text-muted-foreground block">Denda</span>
          <LateFeeCell invoice={invoice} />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {/* Tandai Lunas */}
        {invoice.status === 'UNPAID' && (
          <Button size="sm" variant="outline" className="flex-1" onClick={() => onMarkPaid(invoice.id)} disabled={isMarkingPaid}>
            {isMarkingPaid ? <LoadingSpinner size="sm" /> : 'Tandai Lunas'}
          </Button>
        )}
        {/* Setujui Perpanjangan */}
        {invoice.type === 'EXTENSION' && invoice.status === 'PAID' && (
          <Button size="sm" className="flex-1" onClick={() => onApprove(invoice.id)} disabled={isApproving}>
            {isApproving ? <LoadingSpinner size="sm" /> : 'Setujui Perpanjangan'}
          </Button>
        )}
        {/* Waive Denda / Batalkan Waiver — Req 13.5 */}
        {invoice.status !== 'PAID' && isOverdue && (
          invoice.is_late_fee_waived ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onWaive(invoice.id, false)}
              disabled={isWaiving}
              className="gap-1.5 text-xs flex-1"
            >
              {isWaiving ? <LoadingSpinner size="sm" /> : <ShieldOff className="size-3.5" />}
              Batalkan Waiver
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onWaive(invoice.id, true)}
              disabled={isWaiving}
              className="gap-1.5 text-xs flex-1 text-green-700 border-green-300 hover:bg-green-50"
            >
              {isWaiving ? <LoadingSpinner size="sm" /> : <ShieldCheck className="size-3.5" />}
              Waive Denda
            </Button>
          )
        )}
        {/* Cetak Kwitansi — Req 8.8, 13.3: hanya untuk PAID */}
        {invoice.status === 'PAID' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDownloadReceipt(invoice)}
            disabled={isDownloading}
            className="gap-1.5 text-xs flex-1"
          >
            {isDownloading ? <LoadingSpinner size="sm" /> : <FileDown className="size-3.5" />}
            Cetak Kwitansi
          </Button>
        )}
      </div>
    </div>
  )
}
