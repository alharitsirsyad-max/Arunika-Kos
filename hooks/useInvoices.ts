'use client'

/**
 * hooks/useInvoices.ts
 * Custom hooks for invoice and payment operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { apiRequest, ApiError } from '@/lib/api'
import type { Invoice, InvoiceWithLateFee, PaymentToken } from '@/types/api'

// ---------------------------------------------------------------------------
// Query: fetch current user's invoices (includes late_fee_summary)
// ---------------------------------------------------------------------------

export function useMyInvoices() {
  const router = useRouter()

  return useQuery<InvoiceWithLateFee[]>({
    queryKey: ['invoices'],
    queryFn: async () => {
      try {
        return await apiRequest<InvoiceWithLateFee[]>('/api/invoices/me')
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          router.push('/login')
        }
        throw error
      }
    },
  })
}

// ---------------------------------------------------------------------------
// Mutation: create a payment (Midtrans token)
// ---------------------------------------------------------------------------

export interface CreatePaymentPayload {
  invoice_id: string
}

export function useCreatePayment() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation<PaymentToken, ApiError, CreatePaymentPayload>({
    mutationFn: async (payload) => {
      try {
        return await apiRequest<PaymentToken>('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          router.push('/login')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}

// ---------------------------------------------------------------------------
// Mutation: approve an invoice extension (admin)
// ---------------------------------------------------------------------------

export function useApproveInvoice(invoiceId: string) {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation<Invoice, ApiError, void>({
    mutationFn: async () => {
      try {
        return await apiRequest<Invoice>(`/api/invoices/${invoiceId}/approve`, {
          method: 'PATCH',
        })
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          router.push('/login')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}
