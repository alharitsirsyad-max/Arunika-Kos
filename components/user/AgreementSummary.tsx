/**
 * components/user/AgreementSummary.tsx
 * Menampilkan ringkasan Agreement pada dashboard user.
 *
 * Dua kondisi:
 * - Agreement CONFIRMED : tampilkan nama kamar, agreed_start_date, agreed_price
 * - Agreement DRAFT atau null/undefined : tampilkan info "menunggu konfirmasi admin"
 *
 * Komponen ini murni presentasional — tidak melakukan fetching data apapun.
 *
 * Requirements: 14.3, 14.4
 */

import { CheckCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AgreementSummaryProps {
  agreement:
    | {
        status: 'DRAFT' | 'CONFIRMED'
        agreed_start_date: string // ISO date string
        agreed_price: number
      }
    | null
    | undefined
  /** Nama tipe kamar, dari booking.room_unit.room.name */
  roomName?: string
  /** Nomor unit kamar, dari booking.room_unit.room_number */
  roomNumber?: string
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AgreementSummary({
  agreement,
  roomName,
  roomNumber,
  className,
}: AgreementSummaryProps) {
  // ── CONFIRMED ─────────────────────────────────────────────────────────────
  if (agreement?.status === 'CONFIRMED') {
    const roomLabel = [roomName, roomNumber].filter(Boolean).join(' – ') || '–'

    return (
      <div
        className={cn(
          'rounded-lg border border-green-200 bg-green-50 p-4 space-y-3',
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2">
          <CheckCircle className="size-4 text-green-600 shrink-0" />
          <h3 className="text-sm font-semibold text-green-800">Kesepakatan Sewa Dikonfirmasi</h3>
        </div>

        {/* Detail */}
        <dl className="grid grid-cols-1 gap-y-2 sm:grid-cols-3 sm:gap-x-6 text-sm">
          {/* Nama kamar */}
          <div>
            <dt className="text-xs font-medium text-green-700/70">Kamar</dt>
            <dd className="mt-0.5 font-medium text-green-900">{roomLabel}</dd>
          </div>

          {/* Tanggal masuk */}
          <div>
            <dt className="text-xs font-medium text-green-700/70">Tanggal Masuk</dt>
            <dd className="mt-0.5 font-medium text-green-900">
              {formatDate(agreement.agreed_start_date)}
            </dd>
          </div>

          {/* Harga disepakati */}
          <div>
            <dt className="text-xs font-medium text-green-700/70">Harga Disepakati</dt>
            <dd className="mt-0.5 font-semibold text-green-900">
              {formatRupiah(agreement.agreed_price)}
            </dd>
          </div>
        </dl>
      </div>
    )
  }

  // ── DRAFT atau tidak ada Agreement — sekarang agreement dibuat otomatis ──
  // Jika belum ada agreement, tampilkan info bahwa sedang diproses
  return (
    <div
      className={cn(
        'rounded-lg border border-blue-100 bg-blue-50/50 p-4',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Clock className="size-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">
          Kesepakatan sewa sedang diproses...
        </p>
      </div>
    </div>
  )
}
