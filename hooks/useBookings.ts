'use client'

/**
 * hooks/useBookings.ts
 * Custom hooks for booking operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { apiRequest, ApiError } from '@/lib/api'
import type { Booking, BookingStatus } from '@/types/api'

// ---------------------------------------------------------------------------
// Query: fetch all bookings
// ---------------------------------------------------------------------------

export function useBookings() {
  const router = useRouter()

  return useQuery<Booking[]>({
    queryKey: ['bookings'],
    queryFn: async () => {
      try {
        return await apiRequest<Booking[]>('/api/bookings')
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
// Query: cek apakah user sudah punya booking aktif
// ---------------------------------------------------------------------------

export interface ActiveBookingStatus {
  has_active: boolean
  booking: { id: string; status: string; room_unit: { room: { name: string } } } | null
}

export function useMyActiveBooking() {
  return useQuery<ActiveBookingStatus>({
    queryKey: ['bookings', 'my-active'],
    queryFn: () => apiRequest<ActiveBookingStatus>('/api/bookings/my-active'),
  })
}

// ---------------------------------------------------------------------------
// Mutation: create a new booking
// ---------------------------------------------------------------------------

export interface CreateBookingPayload {
  room_id: string
  start_date: string
  duration_periods: number
}

export function useCreateBooking() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation<Booking, ApiError, CreateBookingPayload>({
    mutationFn: async (payload) => {
      try {
        return await apiRequest<Booking>('/api/bookings', {
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
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
  })
}

// ---------------------------------------------------------------------------
// Mutation: extend an existing booking
// ---------------------------------------------------------------------------

export interface ExtendBookingPayload {
  extra_duration_months: number
}

export function useExtendBooking(bookingId: string) {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation<Booking, ApiError, ExtendBookingPayload>({
    mutationFn: async (payload) => {
      try {
        return await apiRequest<Booking>(`/api/bookings/${bookingId}/extend`, {
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
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
  })
}

// ---------------------------------------------------------------------------
// Mutation: update booking status (admin)
// ---------------------------------------------------------------------------

export interface UpdateBookingStatusPayload {
  status: BookingStatus
  admin_note?: string
}

export function useUpdateBookingStatus(bookingId: string) {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation<Booking, ApiError, UpdateBookingStatusPayload>({
    mutationFn: async (payload) => {
      try {
        return await apiRequest<Booking>(`/api/bookings/${bookingId}/status`, {
          method: 'PATCH',
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
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
  })
}

// ---------------------------------------------------------------------------
// Mutation: admin cancel booking yang tidak dibayar
// ---------------------------------------------------------------------------

export function useCancelBooking() {
  const queryClient = useQueryClient()

  return useMutation<{ booking_id: string; status: string }, ApiError, { bookingId: string; adminNote?: string }>({
    mutationFn: ({ bookingId, adminNote }) =>
      apiRequest(`/api/bookings/${bookingId}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_note: adminNote }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
  })
}

// ---------------------------------------------------------------------------
// Mutation: admin kick user dari booking ACTIVE
// ---------------------------------------------------------------------------

export function useKickBooking() {
  const queryClient = useQueryClient()

  return useMutation<{ booking_id: string; status: string }, ApiError, { bookingId: string; adminNote?: string }>({
    mutationFn: ({ bookingId, adminNote }) =>
      apiRequest(`/api/bookings/${bookingId}/kick`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_note: adminNote }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
  })
}
