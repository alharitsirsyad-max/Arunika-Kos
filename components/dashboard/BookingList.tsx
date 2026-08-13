'use client'

/**
 * components/dashboard/BookingList.tsx
 * Daftar booking user.
 * - APPROVED  → tombol "Bayar Tagihan" ke /dashboard/invoices
 * - ACTIVE    → tombol "Perpanjang"
 * - PENDING / DP_PENDING → tombol "Batalkan Booking"
 * Pesan dari admin (admin_note) ditampilkan di bawah status.
 * Status CANCELLED ditampilkan beserta cancellation_message.
 * Requirements: 5.1, 5.2, 5.5, 5.7, 5.8
 */

import { useState } from 'react'
import Link from 'next/link'
import { CalendarIcon, HomeIcon } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useBookings } from '@/hooks/useBookings'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { ExtendModal } from '@/components/dashboard/ExtendModal'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'
import type { Booking } from '@/types/api'

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

// ── Row (desktop) ──────────────────────────────────────────────────────────

interface RowProps {
  booking: Booking
  onExtend: (id: string) => void
  onCancel: (id: string) => void
}

function BookingRow({ booking, onExtend, onCancel }: RowProps) {
  const canCancel = booking.status === 'PENDING' || booking.status === 'DP_PENDING'

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <HomeIcon className="size-4 text-muted-foreground shrink-0" />
          <span className="font-medium text-sm">{booking.room_unit.room.name}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <CalendarIcon className="size-3.5 shrink-0" />
          {formatDate(booking.start_date)}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {booking.duration_months} bulan
      </td>
      <td className="px-4 py-3">
        <StatusBadge variant="booking" status={booking.status} />
        {booking.admin_note && (
          <p className="text-xs text-muted-foreground mt-1 italic max-w-[200px]">
            "{booking.admin_note}"
          </p>
        )}
        {booking.status === 'CANCELLED' && booking.cancellation_message && (
          <div className="text-xs text-muted-foreground mt-1">
            <span className="italic">"{booking.cancellation_message}"</span>
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        {booking.status === 'APPROVED' && (
          <Link href="/dashboard/invoices">
            <Button size="sm">Bayar Tagihan</Button>
          </Link>
        )}
        {booking.status === 'ACTIVE' && (
          <Button size="sm" variant="outline" onClick={() => onExtend(booking.id)}>
            Perpanjang
          </Button>
        )}
        {canCancel && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onCancel(booking.id)}
          >
            Batalkan Booking
          </Button>
        )}
      </td>
    </tr>
  )
}

// ── Card (mobile) ──────────────────────────────────────────────────────────

function BookingCard({ booking, onExtend, onCancel }: RowProps) {
  const canCancel = booking.status === 'PENDING' || booking.status === 'DP_PENDING'

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <HomeIcon className="size-4 text-muted-foreground shrink-0" />
          <span className="font-medium text-sm">{booking.room_unit.room.name}</span>
        </div>
        <StatusBadge variant="booking" status={booking.status} />
      </div>

      {booking.admin_note && (
        <p className="text-xs text-muted-foreground italic">"{booking.admin_note}"</p>
      )}

      {booking.status === 'CANCELLED' && booking.cancellation_message && (
        <div className="text-xs text-muted-foreground">
          <span className="italic">"{booking.cancellation_message}"</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
        <div>
          <span className="text-xs font-medium text-foreground block">Tanggal Mulai</span>
          {formatDate(booking.start_date)}
        </div>
        <div>
          <span className="text-xs font-medium text-foreground block">Durasi</span>
          {booking.duration_months} bulan
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        {booking.status === 'APPROVED' && (
          <Link href="/dashboard/invoices" className="flex-1">
            <Button size="sm" className="w-full">Bayar Tagihan</Button>
          </Link>
        )}
        {booking.status === 'ACTIVE' && (
          <Button size="sm" variant="outline" className="flex-1" onClick={() => onExtend(booking.id)}>
            Perpanjang
          </Button>
        )}
        {canCancel && (
          <Button
            size="sm"
            variant="destructive"
            className="flex-1"
            onClick={() => onCancel(booking.id)}
          >
            Batalkan Booking
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

export function BookingList() {
  const { data: bookings, isLoading, isError, error, refetch } = useBookings()
  const [extendBookingId, setExtendBookingId] = useState<string | null>(null)

  // Cancel dialog state
  const [cancelTarget, setCancelTarget] = useState<string | null>(null)
  const [cancelMessage, setCancelMessage] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)
  const queryClient = useQueryClient()

  async function handleConfirmCancel() {
    if (!cancelTarget) return
    setIsCancelling(true)
    try {
      const res = await fetch(`/api/bookings/${cancelTarget}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cancellationMessage: cancelMessage || undefined }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Gagal membatalkan booking')
      toast.success('Booking berhasil dibatalkan.')
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      setCancelTarget(null)
      setCancelMessage('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membatalkan booking')
    } finally {
      setIsCancelling(false)
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
        message={error instanceof ApiError ? error.message : 'Gagal memuat daftar booking.'}
        onRetry={() => refetch()}
      />
    )
  }

  if (!bookings || bookings.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed py-12 text-center">
        <HomeIcon className="size-10 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">Belum ada booking</p>
          <p className="text-xs text-muted-foreground mt-1">Mulai dengan melihat kamar yang tersedia.</p>
        </div>
        <Link href="/rooms">
          <Button size="sm">Lihat Kamar</Button>
        </Link>
      </div>
    )
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kamar</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tanggal Mulai</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Durasi</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status / Pesan</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <BookingRow
                key={b.id}
                booking={b}
                onExtend={setExtendBookingId}
                onCancel={setCancelTarget}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {bookings.map((b) => (
          <BookingCard
            key={b.id}
            booking={b}
            onExtend={setExtendBookingId}
            onCancel={setCancelTarget}
          />
        ))}
      </div>

      {extendBookingId && (
        <ExtendModal
          bookingId={extendBookingId}
          open
          onClose={() => setExtendBookingId(null)}
        />
      )}

      {/* Cancel confirmation dialog */}
      {cancelTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !isCancelling && setCancelTarget(null)}
        >
          <div
            className="bg-background rounded-lg shadow-xl w-full max-w-md p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-semibold">Batalkan Booking?</h3>
            <p className="text-sm text-muted-foreground">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="space-y-1">
              <label className="text-xs font-medium">
                Alasan pembatalan <span className="text-muted-foreground">(opsional)</span>
              </label>
              <textarea
                rows={3}
                value={cancelMessage}
                onChange={e => setCancelMessage(e.target.value)}
                maxLength={500}
                placeholder="Masukkan alasan pembatalan..."
                className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground text-right">{cancelMessage.length}/500</p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelTarget(null)}
                disabled={isCancelling}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <span className="flex items-center gap-1.5">
                    <LoadingSpinner size="sm" />
                    Membatalkan...
                  </span>
                ) : (
                  'Konfirmasi Batalkan'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
