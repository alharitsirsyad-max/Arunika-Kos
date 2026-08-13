/**
 * components/user/BookingStepIndicator.tsx
 * Memvisualisasikan lifecycle penuh booking user.
 *
 * Lifecycle normal:  PENDING → DP_PENDING → DP_PAID → ACTIVE → DONE
 * State terminal:    REJECTED (dari PENDING) dan EXPIRED (dari PENDING / DP_PENDING)
 *
 * Visual per step:
 * - Completed (sebelum status saat ini) : lingkaran hijau + ikon centang
 * - Current   (status saat ini)         : lingkaran biru terisi + label tebal
 * - Future    (setelah status saat ini) : lingkaran abu-abu kosong
 *
 * Requirements: 14.2
 */

import { Check, X, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

// ────────────────────────────────────────────────────────────────────────────
// Types & constants
// ────────────────────────────────────────────────────────────────────────────

const LIFECYCLE_STEPS = [
  { status: 'PENDING', label: 'Menunggu' },
  { status: 'DP_PENDING', label: 'Menunggu DP' },
  { status: 'DP_PAID', label: 'DP Terbayar' },
  { status: 'ACTIVE', label: 'Aktif' },
  { status: 'DONE', label: 'Selesai' },
] as const

type LifecycleStatus = (typeof LIFECYCLE_STEPS)[number]['status']
type TerminalStatus = 'REJECTED' | 'EXPIRED'
type BookingStatusProp = LifecycleStatus | TerminalStatus | string

/** Posisi index status dalam lifecycle normal (-1 = tidak ada / terminal) */
function getStepIndex(status: BookingStatusProp): number {
  return LIFECYCLE_STEPS.findIndex((s) => s.status === status)
}

function isTerminal(status: BookingStatusProp): status is TerminalStatus {
  return status === 'REJECTED' || status === 'EXPIRED'
}

// ────────────────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────────────────

type StepState = 'completed' | 'current' | 'future'

interface StepCircleProps {
  state: StepState
  index: number
}

function StepCircle({ state, index }: StepCircleProps) {
  if (state === 'completed') {
    return (
      <div className="flex size-8 items-center justify-center rounded-full bg-green-500 text-white shrink-0">
        <Check className="size-4 stroke-[2.5]" />
      </div>
    )
  }

  if (state === 'current') {
    return (
      <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0 ring-4 ring-primary/20">
        <span className="text-xs font-bold">{index + 1}</span>
      </div>
    )
  }

  // future
  return (
    <div className="flex size-8 items-center justify-center rounded-full border-2 border-muted-foreground/30 bg-background text-muted-foreground/50 shrink-0">
      <span className="text-xs">{index + 1}</span>
    </div>
  )
}

interface ConnectorProps {
  filled: boolean
}

function Connector({ filled }: ConnectorProps) {
  return (
    <div
      className={cn(
        'h-0.5 flex-1 transition-colors',
        filled ? 'bg-green-500' : 'bg-muted-foreground/25',
      )}
    />
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Terminal state banners
// ────────────────────────────────────────────────────────────────────────────

function RejectedBanner() {
  return (
    <div className="mt-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <X className="size-4 shrink-0 text-red-500" />
      <span className="font-medium">Booking ini telah Ditolak</span>
    </div>
  )
}

function ExpiredBanner() {
  return (
    <div className="mt-4 flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
      <Clock className="size-4 shrink-0 text-orange-500" />
      <span className="font-medium">Booking ini telah Hangus</span>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────────────────────

interface BookingStepIndicatorProps {
  status: BookingStatusProp
  className?: string
}

export function BookingStepIndicator({
  status,
  className,
}: BookingStepIndicatorProps) {
  const currentIndex = getStepIndex(status)
  const terminal = isTerminal(status)

  /**
   * Untuk status terminal, tampilkan step hingga titik terjauh yang mungkin
   * dicapai sebelum terminal:
   *  - REJECTED → berasal dari PENDING (index 0)
   *  - EXPIRED  → bisa dari PENDING atau DP_PENDING; tampilkan semua dimmed
   *
   * Kita pakai currentIndex = -1 sehingga semua step tampil sebagai "future"
   * (tidak ada yang highlighted), lalu banner terminal muncul di bawah.
   */
  const effectiveIndex = terminal ? -1 : currentIndex

  return (
    <div className={cn('w-full', className)}>
      {/* ── Step row ─────────────────────────────────────────────────── */}
      <div className="flex items-center">
        {LIFECYCLE_STEPS.map((step, idx) => {
          let state: StepState
          if (terminal) {
            // Semua step dimmed untuk status terminal
            state = 'future'
          } else if (idx < effectiveIndex) {
            state = 'completed'
          } else if (idx === effectiveIndex) {
            // Step ACTIVE dianggap completed juga (booking sudah aktif = berhasil)
            state = status === 'ACTIVE' ? 'completed' : 'current'
          } else {
            state = 'future'
          }

          return (
            <div key={step.status} className="flex flex-1 items-center">
              {/* Connector sebelum step (tidak untuk yang pertama) */}
              {idx > 0 && (
                <Connector filled={!terminal && idx <= effectiveIndex} />              )}

              {/* Step node */}
              <div className="flex flex-col items-center gap-1.5">
                <StepCircle state={state} index={idx} />
                <span
                  className={cn(
                    'text-center text-xs leading-tight',
                    // Responsive: sembunyikan label di layar sangat sempit
                    'hidden sm:block',
                    state === 'current' && 'font-bold text-primary',
                    state === 'completed' && 'font-medium text-green-700',
                    state === 'future' && 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Label baris kedua (mobile only, satu label sekaligus) ────── */}
      <div className="mt-2 flex justify-center sm:hidden">
        {terminal ? (
          <span className="text-xs text-muted-foreground">
            {status === 'REJECTED' ? 'Ditolak' : 'Hangus'}
          </span>
        ) : (
          <span className="text-xs font-semibold text-primary">
            {LIFECYCLE_STEPS[effectiveIndex]?.label ?? ''}
          </span>
        )}
      </div>

      {/* ── Terminal state banner ─────────────────────────────────────── */}
      {status === 'REJECTED' && <RejectedBanner />}
      {status === 'EXPIRED' && <ExpiredBanner />}
    </div>
  )
}
