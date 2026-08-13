'use client'

/**
 * components/admin/InvoiceApprovalTable.tsx
 * Tabel invoice perpanjangan (EXTENSION + PAID) untuk persetujuan admin.
 * Req 14.1 – 14.4
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { useMyInvoices, useApproveInvoice } from '@/hooks/useInvoices'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'
import type { Invoice } from '@/types/api'

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

// ── Row ────────────────────────────────────────────────────────────────────

interface RowProps {
  invoice: Invoice
  onApprove: (id: string) => void
  isApproving: boolean
}

function InvoiceRow({ invoice, onApprove, isApproving }: RowProps) {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {invoice.extra_duration_months} bulan
      </td>
      <td className="px-4 py-3 text-sm font-medium">{formatRupiah(invoice.amount)}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(invoice.created_at)}</td>
      <td className="px-4 py-3">
        <Button
          size="sm"
          onClick={() => onApprove(invoice.id)}
          disabled={isApproving}
        >
          {isApproving ? (
            <span className="flex items-center gap-1.5">
              <LoadingSpinner size="sm" />
              Memproses...
            </span>
          ) : (
            'Setujui Perpanjangan'
          )}
        </Button>
      </td>
    </tr>
  )
}

function InvoiceCard({ invoice, onApprove, isApproving }: RowProps) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-xs font-medium text-foreground block">Perpanjangan</span>
          <span className="text-muted-foreground">{invoice.extra_duration_months} bulan</span>
        </div>
        <div>
          <span className="text-xs font-medium text-foreground block">Jumlah</span>
          <span className="text-muted-foreground">{formatRupiah(invoice.amount)}</span>
        </div>
        <div className="col-span-2">
          <span className="text-xs font-medium text-foreground block">Tanggal Bayar</span>
          <span className="text-muted-foreground">{formatDate(invoice.created_at)}</span>
        </div>
      </div>
      <Button
        size="sm"
        className="w-full"
        onClick={() => onApprove(invoice.id)}
        disabled={isApproving}
      >
        {isApproving ? (
          <span className="flex items-center gap-1.5">
            <LoadingSpinner size="sm" />
            Memproses...
          </span>
        ) : (
          'Setujui Perpanjangan'
        )}
      </Button>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

export function InvoiceApprovalTable() {
  const { data: allInvoices, isLoading, isError, error, refetch } = useMyInvoices()
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const approve = useApproveInvoice(approvingId ?? '')

  // Filter: hanya EXTENSION + PAID
  const invoices = (allInvoices ?? []).filter(
    (inv) => inv.type === 'EXTENSION' && inv.status === 'PAID'
  )

  const handleApprove = async (id: string) => {
    setApprovingId(id)
    try {
      await approve.mutateAsync()
      toast.success('Perpanjangan berhasil disetujui.')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menyetujui perpanjangan.')
    } finally {
      setApprovingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (isError) {
    return (
      <ErrorMessage
        message={error instanceof ApiError ? error.message : 'Gagal memuat data invoice.'}
        onRetry={() => refetch()}
      />
    )
  }

  if (invoices.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        Tidak ada perpanjangan yang menunggu persetujuan.
      </p>
    )
  }

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Perpanjangan</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Jumlah</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tanggal Bayar</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <InvoiceRow
                key={inv.id}
                invoice={inv}
                onApprove={handleApprove}
                isApproving={approvingId === inv.id && approve.isPending}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-3">
        {invoices.map((inv) => (
          <InvoiceCard
            key={inv.id}
            invoice={inv}
            onApprove={handleApprove}
            isApproving={approvingId === inv.id && approve.isPending}
          />
        ))}
      </div>
    </>
  )
}
