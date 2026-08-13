'use client'

/**
 * components/invoices/InvoiceList.tsx
 * Daftar invoice user — dual payment option + InvoiceLateFeeDisplay.
 *
 * Untuk Invoice belum PAID, tampilkan dua opsi:
 *   (a) "Transfer Manual (Konfirmasi Admin)" — nomor rekening + instruksi (opsi primer)
 *   (b) "Bayar via Midtrans" — trigger Midtrans Snap (opsi sekunder)
 *
 * Requirements: 12.2, 12.5, 14.5
 */

import { useState } from 'react'
import Script from 'next/script'
import { useQueryClient } from '@tanstack/react-query'
import { useMyInvoices, useCreatePayment } from '@/hooks/useInvoices'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { InvoiceLateFeeDisplay } from '@/components/user/InvoiceLateFeeDisplay'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreditCard, Building2, ChevronDown, ChevronUp, Copy, CheckCheck, FileDown } from 'lucide-react'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api'
import type { InvoiceWithLateFee } from '@/types/api'

// Midtrans Snap type declaration
declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options?: {
          onSuccess?: (result: unknown) => void
          onPending?: (result: unknown) => void
          onError?: (result: unknown) => void
          onClose?: () => void
        }
      ) => void
    }
  }
}

// ---------------------------------------------------------------------------
// Constants — bank info for manual transfer (Requirement 12.5)
// ---------------------------------------------------------------------------

const BANK_INFO = {
  bank: 'BRI',
  accountNumber: '123456789',
  accountName: 'Seta Aji Dananjaya',
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

// ---------------------------------------------------------------------------
// Invoice type labels (Indonesian)
// ---------------------------------------------------------------------------

const INVOICE_TYPE_LABELS: Record<string, string> = {
  INITIAL: 'Sewa Awal',
  DP: 'Uang Muka (DP)',
  PELUNASAN: 'Pelunasan',
  EXTENSION: 'Perpanjangan',
}

// ---------------------------------------------------------------------------
// Copy-to-clipboard helper button
// ---------------------------------------------------------------------------

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-1.5 inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors"
      title="Salin nomor rekening"
    >
      {copied ? (
        <CheckCheck className="size-3.5 text-green-600" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Download Receipt Button (Requirement 9.1, 9.2)
// ---------------------------------------------------------------------------

function DownloadReceiptButton({ invoiceId, receiptNumber }: { invoiceId: string; receiptNumber?: string }) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/receipt`, { credentials: 'include' })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        toast.error(json?.error?.message ?? 'Gagal mengunduh kwitansi.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kwitansi-${receiptNumber ?? invoiceId}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Gagal mengunduh kwitansi.')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleDownload}
      disabled={isDownloading}
      className="gap-1.5 whitespace-nowrap"
    >
      {isDownloading ? <LoadingSpinner size="sm" /> : <FileDown className="size-3.5" />}
      Unduh Kwitansi
    </Button>
  )
}

// ---------------------------------------------------------------------------
// Manual Transfer Section
// ---------------------------------------------------------------------------

function ManualTransferSection() {
  return (
    <div className="rounded-md border border-blue-200 bg-blue-50 p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <Building2 className="size-4 text-blue-700 shrink-0" />
        <span className="text-sm font-semibold text-blue-800">Transfer Manual</span>
        <Badge variant="outline" className="ml-auto text-xs border-blue-300 text-blue-700 bg-blue-100">
          Opsi Utama
        </Badge>
      </div>

      <div className="text-sm text-blue-900 space-y-1">
        <div className="flex items-center gap-1">
          <span className="text-blue-700 text-xs w-20 shrink-0">Bank</span>
          <span className="font-medium">{BANK_INFO.bank}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-blue-700 text-xs w-20 shrink-0">No. Rekening</span>
          <span className="font-semibold tracking-wide">{BANK_INFO.accountNumber}</span>
          <CopyButton text={BANK_INFO.accountNumber} />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-blue-700 text-xs w-20 shrink-0">Atas Nama</span>
          <span className="font-medium">{BANK_INFO.accountName}</span>
        </div>
      </div>

      <p className="text-xs text-blue-700 border-t border-blue-200 pt-2">
        Setelah transfer, konfirmasi ke Admin melalui WhatsApp atau langsung ke pengelola kos.
        Status tagihan akan diperbarui setelah Admin memverifikasi pembayaran.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skeleton loading row
// ---------------------------------------------------------------------------

function SkeletonRow() {
  return (
    <tr className="border-b last:border-0">
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-muted animate-pulse rounded" />
        </td>
      ))}
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Invoice card (mobile) with dual payment + InvoiceLateFeeDisplay
// ---------------------------------------------------------------------------

interface InvoiceCardProps {
  invoice: InvoiceWithLateFee
  onPayError: (message: string) => void
}

function InvoiceCard({ invoice, onPayError }: InvoiceCardProps) {
  const [paying, setPaying] = useState(false)
  const [showPaymentOptions, setShowPaymentOptions] = useState(false)
  const createPayment = useCreatePayment()
  const queryClient = useQueryClient()

  const verifyAndRefresh = async (invoiceId: string) => {
    try {
      await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: invoiceId }),
      })
    } catch { /* tetap refresh */ }
    queryClient.invalidateQueries({ queryKey: ['invoices'] })
    queryClient.invalidateQueries({ queryKey: ['bookings'] })
  }

  const handleMidtransPay = async () => {
    setPaying(true)
    onPayError('')

    try {
      const { token } = await createPayment.mutateAsync({ invoice_id: invoice.id })

      if (!window.snap) {
        onPayError('Sistem pembayaran belum tersedia. Coba muat ulang halaman.')
        setPaying(false)
        return
      }

      window.snap.pay(token, {
        onSuccess: async () => {
          await verifyAndRefresh(invoice.id)
          setPaying(false)
        },
        onPending: () => {
          queryClient.invalidateQueries({ queryKey: ['invoices'] })
          setPaying(false)
        },
        onError: () => {
          queryClient.invalidateQueries({ queryKey: ['invoices'] })
          setPaying(false)
        },
        onClose: () => {
          queryClient.invalidateQueries({ queryKey: ['invoices'] })
          setPaying(false)
        },
      })
    } catch (error) {
      if (error instanceof ApiError) {
        onPayError(error.message)
      } else {
        onPayError('Gagal memproses pembayaran. Silakan coba lagi.')
      }
      setPaying(false)
    }
  }

  const isUnpaid = invoice.status === 'UNPAID'

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-sm">
          {INVOICE_TYPE_LABELS[invoice.type] ?? invoice.type}
        </span>
        <StatusBadge variant="invoice" status={invoice.status} />
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-xs font-medium text-foreground block">Jumlah</span>
          <span className="text-muted-foreground">{formatRupiah(invoice.amount)}</span>
        </div>
        <div>
          <span className="text-xs font-medium text-foreground block">Jatuh Tempo</span>
          <span className="text-muted-foreground">{formatDate(invoice.due_date)}</span>
        </div>
      </div>

      {/* Late fee display — Requirement 14.5 */}
      <InvoiceLateFeeDisplay invoice={invoice} />

      {/* Payment options — only for UNPAID invoices (Requirement 12.2) */}
      {isUnpaid && (
        <div className="space-y-2 pt-1 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between"
            onClick={() => setShowPaymentOptions((p) => !p)}
          >
            <span>Pilih Cara Pembayaran</span>
            {showPaymentOptions ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </Button>

          {showPaymentOptions && (
            <div className="space-y-3 pt-1">
              {/* Opsi 1: Transfer Manual (Requirement 12.5) */}
              <ManualTransferSection />

              {/* Opsi 2: Bayar via Midtrans */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Atau bayar via Midtrans
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleMidtransPay}
                  disabled={paying}
                  className="w-full"
                >
                  {paying ? (
                    <span className="flex items-center gap-1.5">
                      <LoadingSpinner size="sm" />
                      Memproses...
                    </span>
                  ) : (
                    'Bayar via Midtrans'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Download receipt — only for PAID invoices (Requirement 9.1) */}
      {invoice.status === 'PAID' && (
        <div className="pt-1 border-t">
          <DownloadReceiptButton invoiceId={invoice.id} receiptNumber={invoice.receipt_number ?? undefined} />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Desktop row — expanded into card-like rows to accommodate payment options
// ---------------------------------------------------------------------------

interface InvoiceRowProps {
  invoice: InvoiceWithLateFee
  onPayError: (message: string) => void
}

function InvoiceRow({ invoice, onPayError }: InvoiceRowProps) {
  const [paying, setPaying] = useState(false)
  const [showPaymentOptions, setShowPaymentOptions] = useState(false)
  const createPayment = useCreatePayment()
  const queryClient = useQueryClient()

  const verifyAndRefresh = async (invoiceId: string) => {
    try {
      await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: invoiceId }),
      })
    } catch { /* tetap refresh */ }
    queryClient.invalidateQueries({ queryKey: ['invoices'] })
    queryClient.invalidateQueries({ queryKey: ['bookings'] })
  }

  const handleMidtransPay = async () => {
    setPaying(true)
    onPayError('')

    try {
      const { token } = await createPayment.mutateAsync({ invoice_id: invoice.id })

      if (!window.snap) {
        onPayError('Sistem pembayaran belum tersedia. Coba muat ulang halaman.')
        setPaying(false)
        return
      }

      window.snap.pay(token, {
        onSuccess: async () => {
          await verifyAndRefresh(invoice.id)
          setPaying(false)
        },
        onPending: () => {
          queryClient.invalidateQueries({ queryKey: ['invoices'] })
          setPaying(false)
        },
        onError: () => {
          queryClient.invalidateQueries({ queryKey: ['invoices'] })
          setPaying(false)
        },
        onClose: () => {
          queryClient.invalidateQueries({ queryKey: ['invoices'] })
          setPaying(false)
        },
      })
    } catch (error) {
      if (error instanceof ApiError) {
        onPayError(error.message)
      } else {
        onPayError('Gagal memproses pembayaran. Silakan coba lagi.')
      }
      setPaying(false)
    }
  }

  const isUnpaid = invoice.status === 'UNPAID'

  return (
    <>
      <tr className="border-b hover:bg-muted/30 transition-colors">
        {/* Jenis */}
        <td className="px-4 py-3 text-sm font-medium">
          {INVOICE_TYPE_LABELS[invoice.type] ?? invoice.type}
        </td>

        {/* Jumlah */}
        <td className="px-4 py-3 text-sm">
          {formatRupiah(invoice.amount)}
        </td>

        {/* Jatuh Tempo */}
        <td className="px-4 py-3 text-sm text-muted-foreground">
          {formatDate(invoice.due_date)}
        </td>

        {/* Status */}
        <td className="px-4 py-3">
          <StatusBadge variant="invoice" status={invoice.status} />
        </td>

        {/* Denda */}
        <td className="px-4 py-3">
          <InvoiceLateFeeDisplay invoice={invoice} compact />
        </td>

        {/* Aksi */}
        <td className="px-4 py-3">
          {isUnpaid && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowPaymentOptions((p) => !p)}
              className="whitespace-nowrap"
            >
              Bayar
              {showPaymentOptions ? (
                <ChevronUp className="ml-1 size-3.5" />
              ) : (
                <ChevronDown className="ml-1 size-3.5" />
              )}
            </Button>
          )}
          {invoice.status === 'PAID' && (
            <DownloadReceiptButton invoiceId={invoice.id} receiptNumber={invoice.receipt_number ?? undefined} />
          )}
        </td>
      </tr>

      {/* Expanded payment options row */}
      {isUnpaid && showPaymentOptions && (
        <tr className="border-b bg-muted/20">
          <td colSpan={6} className="px-4 py-4">
            <div className="grid gap-3 sm:grid-cols-2 max-w-2xl">
              {/* Opsi 1: Transfer Manual — Requirement 12.5 */}
              <ManualTransferSection />

              {/* Opsi 2: Bayar via Midtrans */}
              <div className="rounded-md border border-muted bg-background p-3 space-y-2.5">
                <div className="flex items-center gap-2">
                  <CreditCard className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-semibold">Bayar via Midtrans</span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    QRIS / VA / E-Wallet
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Bayar menggunakan QRIS, Virtual Account, atau dompet digital. Status tagihan
                  diperbarui otomatis setelah pembayaran berhasil.
                </p>
                <Button
                  size="sm"
                  onClick={handleMidtransPay}
                  disabled={paying}
                  className="w-full"
                >
                  {paying ? (
                    <span className="flex items-center gap-1.5">
                      <LoadingSpinner size="sm" />
                      Memproses...
                    </span>
                  ) : (
                    'Bayar Sekarang'
                  )}
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Main InvoiceList component
// ---------------------------------------------------------------------------

export function InvoiceList() {
  const { data: invoices, isLoading, isError, error, refetch } = useMyInvoices()
  const [payError, setPayError] = useState<string>('')

  const errorMessage =
    error instanceof ApiError ? error.message : 'Gagal memuat daftar tagihan.'

  // --- Loading state ---
  if (isLoading) {
    return (
      <>
        {/* Table skeleton — desktop */}
        <div className="hidden md:block overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Jenis</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Jumlah</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Jatuh Tempo</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Denda</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map((i) => (
                <SkeletonRow key={i} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Card skeleton — mobile */}
        <div className="md:hidden space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex justify-between">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-5 w-20 bg-muted animate-pulse rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="h-4 bg-muted animate-pulse rounded" />
                <div className="h-4 bg-muted animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </>
    )
  }

  // --- Error state ---
  if (isError) {
    return <ErrorMessage message={errorMessage} onRetry={() => refetch()} />
  }

  // --- Empty state ---
  if (!invoices || invoices.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-12 text-center">
        <p className="text-sm font-medium text-muted-foreground">Belum ada tagihan</p>
      </div>
    )
  }

  return (
    <>
      {/* Midtrans Snap Script */}
      <Script
        src="https://app.sandbox.midtrans.com/snap/snap.js"
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? ''}
        strategy="lazyOnload"
      />

      {/* Payment error */}
      {payError && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {payError}
        </div>
      )}

      {/* Table — desktop */}
      <div className="hidden md:block overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Jenis</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Jumlah</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Jatuh Tempo</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Denda</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <InvoiceRow
                key={invoice.id}
                invoice={invoice}
                onPayError={setPayError}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards — mobile */}
      <div className="md:hidden space-y-3">
        {invoices.map((invoice) => (
          <InvoiceCard
            key={invoice.id}
            invoice={invoice}
            onPayError={setPayError}
          />
        ))}
      </div>
    </>
  )
}
