'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest, ApiError } from '@/lib/api'
import { useRouter } from 'next/navigation'

// ── Tipe admin invoice (lebih lengkap dari invoice user biasa) ─────────────

export interface AdminInvoiceLateFee {
  days_overdue: number
  total_late_fee: number
  is_waived: boolean
}

export interface AdminInvoice {
  id: string
  type: 'INITIAL' | 'DP' | 'PELUNASAN' | 'EXTENSION'
  extra_duration_months: number | null
  amount: number
  due_date: string
  status: 'UNPAID' | 'PENDING_VERIFICATION' | 'PAID'
  grace_period_days: number
  late_fee_per_day: number
  is_late_fee_waived: boolean
  receipt_number: string | null
  created_at: string
  booking: {
    id: string
    status: string
    user: { id: string; name: string; email: string }
    room_unit: { room_number: string; room: { name: string } }
  }
  payment: {
    id: string
    status: string
    paid_at: string | null
    payment_method: string | null
    amount: number
  } | null
  late_fee_summary: AdminInvoiceLateFee
}

export function useAdminInvoices() {
  const router = useRouter()
  return useQuery<AdminInvoice[]>({
    queryKey: ['admin-invoices'],
    queryFn: async () => {
      try {
        return await apiRequest<AdminInvoice[]>('/api/admin/invoices')
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) router.push('/login')
        throw error
      }
    },
  })
}

// ── Check expired bookings ────────────────────────────────────────────────

export function useCheckExpiredBookings() {
  const queryClient = useQueryClient()
  return useMutation<{ checked: number; renewal_invoices_created: number }, ApiError, void>({
    mutationFn: () =>
      apiRequest('/api/admin/bookings/check-expired', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] })
    },
  })
}

// ── Tandai invoice sebagai PAID manual ────────────────────────────────────

export function useMarkInvoicePaid() {
  const queryClient = useQueryClient()
  return useMutation<{ invoice_id: string; status: string }, ApiError, string>({
    mutationFn: (invoiceId) =>
      apiRequest(`/api/admin/invoices/${invoiceId}/mark-paid`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}

// ── Waive / batalkan waiver denda keterlambatan ───────────────────────────

export function useWaiveAdminLateFee() {
  const queryClient = useQueryClient()
  return useMutation<{ id: string; is_late_fee_waived: boolean }, ApiError, { invoiceId: string; waive: boolean }>({
    mutationFn: ({ invoiceId, waive }) =>
      apiRequest(`/api/admin/invoices/${invoiceId}/waive-late-fee`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waive }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] })
    },
  })
}

// ── Update unit status secara manual ─────────────────────────────────────

export function useUpdateUnitStatus() {
  const queryClient = useQueryClient()
  return useMutation<
    { id: string; room_number: string; status: string; kicked_bookings?: string[] },
    ApiError,
    { roomId: string; unitId: string; status: 'AVAILABLE' | 'OCCUPIED'; adminNote?: string }
  >({
    mutationFn: ({ roomId, unitId, status, adminNote }) =>
      apiRequest(`/api/rooms/${roomId}/units/${unitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, admin_note: adminNote }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
  })
}
