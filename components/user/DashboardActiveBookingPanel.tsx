'use client'

/**
 * components/user/DashboardActiveBookingPanel.tsx
 *
 * Panel utama di dashboard user yang menampilkan status booking terkini.
 *
 * Behaviour:
 * - Loading: tampilkan skeleton
 * - Tidak ada booking sama sekali → empty state dengan tautan ke /rooms (Req 14.1)
 * - Semua booking sudah terminal (DONE/REJECTED/EXPIRED) → empty state serupa
 * - Ada booking aktif/dalam-proses:
 *     • BookingStepIndicator untuk lifecycle penuh (Req 14.2)
 *     • AgreementSummary jika status === 'DP_PAID' (Req 14.3, 14.4)
 *     • RenewalBanner jika status === 'ACTIVE' + Agreement CONFIRMED (Req 14.7)
 *
 * Data diambil via useBookings() yang sudah ada — tidak ada fetch tambahan.
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4
 */

import Link from 'next/link'
import { HomeIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { BookingStepIndicator } from '@/components/user/BookingStepIndicator'
import { AgreementSummary } from '@/components/user/AgreementSummary'
import { RenewalBanner } from '@/components/user/RenewalBanner'
import { useBookings } from '@/hooks/useBookings'
import { ApiError } from '@/lib/api'
import type { Booking, BookingStatus } from '@/types/api'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Status yang dianggap "masih dalam proses" — layak ditampilkan di panel ini */
const ACTIVE_STATUSES: BookingStatus[] = [
  'PENDING',
  'DP_PENDING',
  'DP_PAID',
  'ACTIVE',
]

/**
 * Pilih booking paling relevan untuk ditampilkan:
 * Prioritas: ACTIVE > DP_PAID > DP_PENDING > PENDING
 * Jika ada beberapa dengan prioritas sama, ambil yang paling baru.
 */
const STATUS_PRIORITY: Record<string, number> = {
  ACTIVE: 4,
  DP_PAID: 3,
  DP_PENDING: 2,
  PENDING: 1,
}

function pickPrimaryBooking(bookings: Booking[]): Booking | null {
  const candidates = bookings.filter((b) =>
    ACTIVE_STATUSES.includes(b.status as BookingStatus),
  )

  if (candidates.length === 0) return null

  return candidates.reduce((best, current) => {
    const bestPriority = STATUS_PRIORITY[best.status] ?? 0
    const currentPriority = STATUS_PRIORITY[current.status] ?? 0
    if (currentPriority > bestPriority) return current
    if (currentPriority === bestPriority) {
      // Ambil yang lebih baru
      return new Date(current.created_at) > new Date(best.created_at)
        ? current
        : best
    }
    return best
  })
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed py-12 text-center">
      <HomeIcon className="size-10 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium">Belum ada booking aktif</p>
        <p className="text-xs text-muted-foreground mt-1">
          Temukan kamar yang sesuai dan ajukan booking sekarang.
        </p>
      </div>
      <Link href="/rooms">
        <Button size="sm">Lihat Katalog Kamar</Button>
      </Link>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DashboardActiveBookingPanel() {
  const { data: bookings, isLoading, isError, error, refetch } = useBookings()

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <ErrorMessage
        message={
          error instanceof ApiError ? error.message : 'Gagal memuat data booking.'
        }
        onRetry={() => refetch()}
      />
    )
  }

  // ── Empty (no bookings at all, or all terminal) ────────────────────────────
  const primaryBooking = bookings ? pickPrimaryBooking(bookings) : null

  if (!primaryBooking) {
    return <EmptyState />
  }

  // ── Active booking found ───────────────────────────────────────────────────
  const { status, agreement, room_unit } = primaryBooking
  const roomName = room_unit?.room?.name
  const roomNumber = room_unit?.room_number

  // Kondisi untuk RenewalBanner: ACTIVE + Agreement CONFIRMED + ada tanggal
  const showRenewalBanner =
    status === 'ACTIVE' &&
    agreement?.status === 'CONFIRMED' &&
    !!agreement.agreed_start_date &&
    typeof primaryBooking.duration_periods === 'number' &&
    typeof room_unit?.room?.period_months === 'number'

  return (
    <div className="space-y-4">
      {/* ── Step Indicator (selalu tampil jika ada booking) ── */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold mb-4">Status Booking</h3>
        <BookingStepIndicator status={status} />
      </div>

      {/* ── Agreement Summary (hanya saat DP_PAID) ── */}
      {status === 'DP_PAID' && (
        <AgreementSummary
          agreement={agreement}
          roomName={roomName}
          roomNumber={roomNumber}
        />
      )}

      {/* ── Renewal Banner (hanya saat ACTIVE + Agreement CONFIRMED) ── */}
      {showRenewalBanner && (
        <RenewalBanner
          bookingStatus={status}
          agreedStartDate={agreement!.agreed_start_date}
          durationPeriods={primaryBooking.duration_periods!}
          periodMonths={room_unit!.room.period_months!}
        />
      )}
    </div>
  )
}
