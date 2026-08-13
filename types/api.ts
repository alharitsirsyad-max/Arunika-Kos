/**
 * types/api.ts
 * Frontend TypeScript interfaces matching backend API response shapes.
 */

// ---------------------------------------------------------------------------
// Generic API response wrapper
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: { code: string; message: string }
}

// ---------------------------------------------------------------------------
// Room
// ---------------------------------------------------------------------------

export type UnitStatus = 'AVAILABLE' | 'RESERVED' | 'OCCUPIED'

export interface RoomUnit {
  id: string
  room_id: string
  room_number: string
  status: UnitStatus
  /** Nama penyewa aktif (dari Booking DP_PAID atau ACTIVE); null jika tidak ada — Requirement 10.5 */
  tenant_name?: string | null
  /** Nomor telepon penyewa aktif; null jika tidak ada — Requirement 10.5 */
  tenant_phone?: string | null
}

export interface Room {
  id: string
  name: string
  price: number
  /** Jumlah bulan dalam satu periode harga — Requirement 1.8 */
  period_months?: number
  description?: string
  facilities: string[]
  capacity?: number
  images: { id: string; room_id: string; image_url: string }[]
  units?: RoomUnit[]
  // Info unit — dihitung dari backend
  available_units?: number
  total_units?: number
}

// ---------------------------------------------------------------------------
// Booking
// ---------------------------------------------------------------------------

export type BookingStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'DP_PENDING'
  | 'DP_PAID'
  | 'ACTIVE'
  | 'REJECTED'
  | 'DONE'
  | 'EXPIRED'
  | 'CANCELLED'

export interface Booking {
  id: string
  user_id: string
  room_unit_id: string
  room_unit: {
    id: string
    room_number?: string
    room: { name: string; price: number; period_months?: number }
  }
  user?: {
    id: string
    name: string
    email: string
    emergency_contacts?: EmergencyContact[]
  }
  start_date: string
  /** @deprecated gunakan duration_periods */
  duration_months?: number
  duration_periods?: number
  total_price: number
  status: BookingStatus
  admin_note?: string | null
  cancellation_message?: string | null
  invoices?: InvoiceWithLateFee[]
  agreement?: Agreement | null
  last_reminder_sent_at?: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Agreement
// ---------------------------------------------------------------------------

export type AgreementStatus = 'DRAFT' | 'CONFIRMED'

export interface Agreement {
  id: string
  booking_id: string
  room_unit_id: string
  agreed_start_date: string
  agreed_price: number
  status: AgreementStatus
  confirmed_by: string | null
  confirmed_at: string | null
  confirmer?: { id: string; name: string } | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Emergency Contact
// ---------------------------------------------------------------------------

export type RelationshipType = 'ORANG_TUA' | 'SAUDARA' | 'TEMAN'

export interface EmergencyContact {
  id: string
  user_id: string
  name: string
  relationship: RelationshipType
  phone_number: string
  created_at: string
}

// ---------------------------------------------------------------------------
// Invoice
// ---------------------------------------------------------------------------

export type InvoiceType = 'INITIAL' | 'DP' | 'PELUNASAN' | 'EXTENSION'
export type InvoiceStatus = 'UNPAID' | 'PENDING_VERIFICATION' | 'PAID' | 'CANCELLED' | 'REFUND_PENDING'

export interface InvoiceItem {
  id: string
  invoice_id: string
  description: string
  amount: number
  created_at: string
}

export interface LateFeeSummary {
  days_overdue: number
  total_late_fee: number
  is_waived: boolean
}

export interface Invoice {
  id: string
  type: InvoiceType
  extra_duration_months: number | null
  amount: number
  due_date: string
  status: InvoiceStatus
  created_at: string
}

export interface InvoiceWithLateFee extends Invoice {
  grace_period_days?: number
  late_fee_per_day?: number
  is_late_fee_waived?: boolean
  receipt_number?: string | null
  dp_amount?: number | null
  items?: InvoiceItem[]
  late_fee_summary?: LateFeeSummary
}

// ---------------------------------------------------------------------------
// Identity Document
// ---------------------------------------------------------------------------

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'
export type DocumentType = 'KTP' | 'KARTU_PELAJAR' | 'KK'

export interface IdentityDocumentPublic {
  id: string
  document_type: DocumentType
  verification_status: VerificationStatus
  verified_at: string | null
  created_at: string
}

export interface IdentityStatus {
  is_verified: boolean
  has_pending: boolean
  has_rejected: boolean
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

export type ReportType = 'WEBSITE_ISSUE' | 'ROOM_ISSUE'
export type ReportStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'

export interface Report {
  id: string
  user: { name: string }
  type: ReportType
  title: string
  description: string
  status: ReportStatus
  admin_note?: string
  created_at: string
}

// ---------------------------------------------------------------------------
// Payment
// ---------------------------------------------------------------------------

export interface PaymentToken {
  token: string
  redirect_url: string
}

// ---------------------------------------------------------------------------
// Notification
// ---------------------------------------------------------------------------

export type NotificationType =
  | 'BOOKING_EXPIRED'
  | 'AGREEMENT_CONFIRMED'
  | 'BOOKING_ACTIVE'
  | 'RENEWAL_REMINDER'

export interface Notification {
  id: string
  type: NotificationType
  message: string
  is_read: boolean
  related_booking_id: string | null
  created_at: string
}

export interface NotificationsResponse {
  notifications: Notification[]
  unread_count: number
  total: number
}
