'use client'

/**
 * components/admin/BookingTable.tsx
 * Tabel booking untuk admin:
 * - PENDING  → Setujui / Tolak (+ pesan opsional)
 * - DP_PAID  → Lihat Detail (Agreement, Invoice, dll)
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { useBookings, useUpdateBookingStatus, useCancelBooking, useKickBooking } from '@/hooks/useBookings'
import { ClickableUserName } from '@/components/admin/ClickableUserName'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'
import type { Booking, BookingStatus } from '@/types/api'

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

interface ActionState {
  bookingId: string
  action: 'DP_PENDING' | 'REJECTED' | 'CANCEL_UNPAID' | 'KICK_ACTIVE'
  adminNote: string
}

// ── Action Panel ───────────────────────────────────────────────────────────

interface ActionPanelProps {
  state: ActionState
  onChange: (note: string) => void
  onConfirm: () => void
  onCancel: () => void
  isLoading: boolean
}

function ActionPanel({ state, onChange, onConfirm, onCancel, isLoading }: ActionPanelProps) {
  const isApprove = state.action === 'DP_PENDING'
  const isCancel = state.action === 'CANCEL_UNPAID'
  const isKick = state.action === 'KICK_ACTIVE'

  const bgClass = isApprove
    ? 'border-green-200 bg-green-50/50'
    : isKick
      ? 'border-orange-200 bg-orange-50/50'
      : 'border-destructive/30 bg-destructive/5'

  const title = isApprove
    ? '✅ Setujui booking ini?'
    : isKick
      ? '🚪 Keluarkan penyewa ini? (sewa masih aktif)'
      : isCancel
        ? '⚠️ Batalkan booking ini? (tagihan belum dibayar)'
        : '❌ Tolak booking ini?'

  const placeholder = isApprove
    ? 'contoh: Booking Anda disetujui. Silakan segera lakukan pembayaran.'
    : isKick
      ? 'contoh: Sewa Anda diakhiri karena alasan tertentu.'
      : isCancel
        ? 'contoh: Booking Anda dibatalkan karena tagihan melewati jatuh tempo.'
        : 'contoh: Maaf, unit tidak tersedia untuk tanggal yang diminta.'

  const confirmVariant = isApprove ? 'default' : 'destructive'
  const confirmLabel = isApprove ? 'Setujui' : isKick ? 'Keluarkan Penyewa' : isCancel ? 'Batalkan Booking' : 'Tolak'

  return (
    <div className={`rounded-lg border p-4 space-y-3 ${bgClass}`}>
      <p className="text-sm font-medium">{title}</p>

      {isCancel && (
        <p className="text-xs text-orange-700">
          Unit kamar akan dibebaskan dan user dapat melakukan booking ulang setelah dibatalkan.
        </p>
      )}
      {isKick && (
        <p className="text-xs text-orange-700">
          Penyewa akan dikeluarkan, unit kamar dibebaskan, dan invoice yang belum dibayar akan dihapus.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Pesan untuk penyewa <span className="font-normal">(opsional)</span>
        </label>
        <textarea
          rows={2}
          value={state.adminNote}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={500}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none resize-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        />
        <p className="text-xs text-muted-foreground text-right">{state.adminNote.length}/500</p>
      </div>

      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" onClick={onCancel} disabled={isLoading}>
          Batal
        </Button>
        <Button size="sm" variant={confirmVariant} onClick={onConfirm} disabled={isLoading}>
          {isLoading ? (
            <span className="flex items-center gap-1.5">
              <LoadingSpinner size="sm" />
              Memproses...
            </span>
          ) : confirmLabel}
        </Button>
      </div>
    </div>
  )
}

// ── Row ────────────────────────────────────────────────────────────────────

interface RowProps {
  booking: Booking
  onAction: (state: ActionState) => void
}

function BookingRow({ booking, onAction }: RowProps) {
  // Cek apakah ada invoice yang belum dibayar
  const hasUnpaidInvoice = booking.invoices?.some((inv) => inv.status === 'UNPAID')

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3 text-sm font-medium">
        <ClickableUserName userId={booking.user_id} name={booking.user?.name ?? '-'} />
      </td>
      <td className="px-4 py-3 text-sm">{booking.room_unit.room.name}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(booking.start_date)}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{booking.duration_periods ?? booking.duration_months} periode</td>
      <td className="px-4 py-3">
        <StatusBadge variant="booking" status={booking.status} />
      </td>
      <td className="px-4 py-3">
        {booking.admin_note && (
          <p className="text-xs text-muted-foreground italic mb-1 max-w-[200px] truncate" title={booking.admin_note}>
            "{booking.admin_note}"
          </p>
        )}
        <div className="flex gap-2">
          {booking.status === 'PENDING' && (
            <>
              <Button
                size="sm"
                disabled={!!(booking as { unit_has_conflict?: boolean }).unit_has_conflict}
                title={(booking as { unit_has_conflict?: boolean }).unit_has_conflict
                  ? 'Unit sudah memiliki booking aktif — tidak dapat disetujui'
                  : undefined}
                onClick={() => onAction({ bookingId: booking.id, action: 'DP_PENDING', adminNote: '' })}
              >
                Setujui
              </Button>
              <Button size="sm" variant="destructive" onClick={() => onAction({ bookingId: booking.id, action: 'REJECTED', adminNote: '' })}>
                Tolak
              </Button>
            </>
          )}
          {booking.status === 'DP_PENDING' && hasUnpaidInvoice && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onAction({ bookingId: booking.id, action: 'CANCEL_UNPAID', adminNote: '' })}
            >
              Batalkan
            </Button>
          )}
          {booking.status === 'ACTIVE' && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onAction({ bookingId: booking.id, action: 'KICK_ACTIVE', adminNote: '' })}
            >
              Keluarkan
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}

function BookingCard({ booking, onAction }: RowProps) {
  const hasUnpaidInvoice = booking.invoices?.some((inv) => inv.status === 'UNPAID')

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-medium text-sm">{booking.room_unit.room.name}</span>
          {booking.user && (
            <p className="text-xs text-muted-foreground mt-0.5">
              <ClickableUserName userId={booking.user_id} name={booking.user?.name ?? '-'} className="text-sm font-medium" />
            </p>
          )}
        </div>
        <StatusBadge variant="booking" status={booking.status} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
        <div>
          <span className="text-xs font-medium text-foreground block">Tanggal Mulai</span>
          {formatDate(booking.start_date)}
        </div>
        <div>
          <span className="text-xs font-medium text-foreground block">Durasi</span>
          {(booking.duration_periods ?? booking.duration_months) ?? '-'} periode
        </div>
      </div>
      {booking.admin_note && (
        <p className="text-xs text-muted-foreground italic">"{booking.admin_note}"</p>
      )}
      <div className="flex gap-2 pt-1">
        {booking.status === 'PENDING' && (
          <>
            <Button
              size="sm"
              className="flex-1"
              disabled={!!(booking as { unit_has_conflict?: boolean }).unit_has_conflict}
              title={(booking as { unit_has_conflict?: boolean }).unit_has_conflict
                ? 'Unit sudah memiliki booking aktif — tidak dapat disetujui'
                : undefined}
              onClick={() => onAction({ bookingId: booking.id, action: 'DP_PENDING', adminNote: '' })}
            >
              Setujui
            </Button>
            <Button size="sm" variant="destructive" className="flex-1" onClick={() => onAction({ bookingId: booking.id, action: 'REJECTED', adminNote: '' })}>
              Tolak
            </Button>
          </>
        )}
        {booking.status === 'DP_PENDING' && hasUnpaidInvoice && (
          <Button size="sm" variant="destructive" className="w-full" onClick={() => onAction({ bookingId: booking.id, action: 'CANCEL_UNPAID', adminNote: '' })}>
            Batalkan (belum bayar)
          </Button>
        )}
        {booking.status === 'ACTIVE' && (
          <Button size="sm" variant="destructive" className="w-full" onClick={() => onAction({ bookingId: booking.id, action: 'KICK_ACTIVE', adminNote: '' })}>
            Keluarkan Penyewa
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

export function BookingTable() {
  const { data: bookings, isLoading, isError, error, refetch } = useBookings()
  const [pending, setPending] = useState<ActionState | null>(null)
  const updateStatus = useUpdateBookingStatus(pending?.bookingId ?? '')
  const cancelBooking = useCancelBooking()
  const kickBooking = useKickBooking()

  const isActing = updateStatus.isPending || cancelBooking.isPending || kickBooking.isPending

  const handleConfirm = async () => {
    if (!pending) return
    try {
      if (pending.action === 'CANCEL_UNPAID') {
        await cancelBooking.mutateAsync({ bookingId: pending.bookingId, adminNote: pending.adminNote || undefined })
        toast.success('Booking berhasil dibatalkan. Unit kamar telah dibebaskan.')
      } else if (pending.action === 'KICK_ACTIVE') {
        await kickBooking.mutateAsync({ bookingId: pending.bookingId, adminNote: pending.adminNote || undefined })
        toast.success('Penyewa berhasil dikeluarkan. Unit kamar telah dibebaskan.')
      } else {
        await updateStatus.mutateAsync({ status: pending.action as BookingStatus, admin_note: pending.adminNote || undefined })
        toast.success(pending.action === 'DP_PENDING' ? 'Booking disetujui, invoice DP dibuat.' : 'Booking ditolak.')
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal memproses aksi.')
    } finally {
      setPending(null)
    }
  }

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>

  if (isError) {
    return (
      <ErrorMessage
        message={error instanceof ApiError ? error.message : 'Gagal memuat data booking.'}
        onRetry={() => refetch()}
      />
    )
  }

  if (!bookings || bookings.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-12">Belum ada data booking.</p>
  }

  return (
    <div className="space-y-4">
      {/* Action panel */}
      {pending && (
        <ActionPanel
          state={pending}
          onChange={(note) => setPending((prev) => prev ? { ...prev, adminNote: note } : null)}
          onConfirm={handleConfirm}
          onCancel={() => setPending(null)}
          isLoading={isActing}
        />
      )}

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Penyewa</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kamar</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Mulai</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Durasi</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <BookingRow key={booking.id} booking={booking} onAction={setPending} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {bookings.map((booking) => (
          <BookingCard key={booking.id} booking={booking} onAction={setPending} />
        ))}
      </div>
    </div>
  )
}
