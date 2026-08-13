import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type {
  BookingStatus,
  InvoiceStatus,
  VerificationStatus,
  ReportStatus,
} from '@/types/api'

// ────────────────────────────────────────────────────────────────────────────
// Label maps (Indonesian UI text)
// ────────────────────────────────────────────────────────────────────────────

const BOOKING_LABELS: Record<BookingStatus, string> = {
  PENDING: 'Menunggu',
  APPROVED: 'Disetujui',
  DP_PENDING: 'Menunggu DP',
  DP_PAID: 'DP Lunas',
  ACTIVE: 'Aktif',
  REJECTED: 'Ditolak',
  DONE: 'Selesai',
  EXPIRED: 'Hangus',
  CANCELLED: 'Dibatalkan',
}

const INVOICE_LABELS: Record<InvoiceStatus, string> = {
  UNPAID: 'Belum Dibayar',
  PENDING_VERIFICATION: 'Menunggu Verifikasi',
  PAID: 'Lunas',
  CANCELLED: 'Dibatalkan',
  REFUND_PENDING: 'Menunggu Refund',
}

const IDENTITY_LABELS: Record<VerificationStatus, string> = {
  PENDING: 'Menunggu Verifikasi',
  VERIFIED: 'Terverifikasi',
  REJECTED: 'Ditolak',
}

const REPORT_LABELS: Record<ReportStatus, string> = {
  OPEN: 'Terbuka',
  IN_PROGRESS: 'Diproses',
  RESOLVED: 'Selesai',
}

// ────────────────────────────────────────────────────────────────────────────
// Color maps — Tailwind inline classes per status
// ────────────────────────────────────────────────────────────────────────────

const BOOKING_COLORS: Record<BookingStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  APPROVED: 'bg-blue-100 text-blue-800 border-blue-200',
  DP_PENDING: 'bg-orange-100 text-orange-800 border-orange-200',
  DP_PAID: 'bg-blue-100 text-blue-800 border-blue-200',
  ACTIVE: 'bg-green-100 text-green-800 border-green-200',
  REJECTED: 'bg-red-100 text-red-800 border-red-200',
  DONE: 'bg-gray-100 text-gray-700 border-gray-200',
  EXPIRED: 'bg-red-100 text-red-700 border-red-200',
  CANCELLED: 'bg-gray-100 text-gray-600 border-gray-200',
}

const INVOICE_COLORS: Record<InvoiceStatus, string> = {
  UNPAID: 'bg-red-100 text-red-800 border-red-200',
  PENDING_VERIFICATION: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  PAID: 'bg-green-100 text-green-800 border-green-200',
  CANCELLED: 'bg-gray-100 text-gray-600 border-gray-200',
  REFUND_PENDING: 'bg-orange-100 text-orange-700 border-orange-200',
}

const IDENTITY_COLORS: Record<VerificationStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  VERIFIED: 'bg-green-100 text-green-800 border-green-200',
  REJECTED: 'bg-red-100 text-red-800 border-red-200',
}

const REPORT_COLORS: Record<ReportStatus, string> = {
  OPEN: 'bg-red-100 text-red-800 border-red-200',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 border-blue-200',
  RESOLVED: 'bg-green-100 text-green-800 border-green-200',
}

// ────────────────────────────────────────────────────────────────────────────
// Variant union types
// ────────────────────────────────────────────────────────────────────────────

export type StatusBadgeVariant = 'booking' | 'invoice' | 'identity' | 'report'

type StatusForVariant<V extends StatusBadgeVariant> =
  V extends 'booking'
    ? BookingStatus
    : V extends 'invoice'
      ? InvoiceStatus
      : V extends 'identity'
        ? VerificationStatus
        : ReportStatus

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────

interface StatusBadgeProps<V extends StatusBadgeVariant> {
  variant: V
  status: StatusForVariant<V>
  className?: string
}

export function StatusBadge<V extends StatusBadgeVariant>({
  variant,
  status,
  className,
}: StatusBadgeProps<V>) {
  let label: string
  let colorClass: string

  switch (variant) {
    case 'booking': {
      const s = status as BookingStatus
      label = BOOKING_LABELS[s] ?? s
      colorClass = BOOKING_COLORS[s] ?? ''
      break
    }
    case 'invoice': {
      const s = status as InvoiceStatus
      label = INVOICE_LABELS[s] ?? s
      colorClass = INVOICE_COLORS[s] ?? ''
      break
    }
    case 'identity': {
      const s = status as VerificationStatus
      label = IDENTITY_LABELS[s] ?? s
      colorClass = IDENTITY_COLORS[s] ?? ''
      break
    }
    case 'report': {
      const s = status as ReportStatus
      label = REPORT_LABELS[s] ?? s
      colorClass = REPORT_COLORS[s] ?? ''
      break
    }
    default: {
      label = String(status)
      colorClass = ''
    }
  }

  return (
    <Badge
      variant="outline"
      className={cn(colorClass, 'font-medium', className)}
    >
      {label}
    </Badge>
  )
}
