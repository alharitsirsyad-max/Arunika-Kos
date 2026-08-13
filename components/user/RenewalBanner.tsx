'use client'

/**
 * components/user/RenewalBanner.tsx
 * Banner peringatan perpanjangan sewa pada dashboard user.
 *
 * Tampilkan jika:
 *   - bookingStatus === 'ACTIVE'
 *   - remainingDays > 0
 *   - remainingDays ≤ 30
 *
 * Sembunyikan (return null) jika kondisi di atas tidak terpenuhi.
 *
 * Requirements: 14.7
 */

import Link from 'next/link'
import { addMonths, differenceInDays, startOfDay } from 'date-fns'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

const formatDate = (date: Date) =>
  date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RenewalBannerProps {
  bookingStatus: string
  agreedStartDate: string    // ISO date string dari agreement.agreed_start_date
  durationPeriods: number    // booking.duration_periods
  periodMonths: number       // booking.room_unit.room.period_months
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RenewalBanner({
  bookingStatus,
  agreedStartDate,
  durationPeriods,
  periodMonths,
  className,
}: RenewalBannerProps) {
  // Hitung tanggal akhir sewa dan sisa hari
  const endDate = addMonths(new Date(agreedStartDate), durationPeriods * periodMonths)
  const today = startOfDay(new Date())
  const remainingDays = differenceInDays(endDate, today)

  // Kondisi untuk menampilkan banner
  if (bookingStatus !== 'ACTIVE' || remainingDays <= 0 || remainingDays > 30) {
    return null
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-amber-300 bg-amber-50 p-4',
        className,
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Pesan */}
        <div className="flex items-start gap-3">
          <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-amber-800">
              Masa sewa akan segera berakhir
            </p>
            <p className="text-sm text-amber-700">
              Masa sewa Anda akan berakhir dalam{' '}
              <strong>{remainingDays} hari</strong>{' '}
              ({formatDate(endDate)})
            </p>
          </div>
        </div>

        {/* Tombol ajukan perpanjangan */}
        <Link
          href="/dashboard/reports"
          className={cn(
            'inline-flex items-center justify-center rounded-md px-4 py-2',
            'text-sm font-medium whitespace-nowrap',
            'bg-amber-600 text-white hover:bg-amber-700',
            'transition-colors focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-amber-600 focus-visible:ring-offset-2',
            'sm:shrink-0',
          )}
        >
          Ajukan Perpanjangan
        </Link>
      </div>
    </div>
  )
}
