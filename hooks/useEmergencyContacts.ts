'use client'

/**
 * hooks/useEmergencyContacts.ts
 * TanStack Query hooks for Emergency Contact CRUD operations.
 *
 * Covers:
 *  - useEmergencyContacts   — GET /api/emergency-contacts/me
 *  - useAddEmergencyContact — POST /api/emergency-contacts
 *  - useUpdateEmergencyContact — PUT /api/emergency-contacts/:id
 *  - useDeleteEmergencyContact — DELETE /api/emergency-contacts/:id
 *
 * Requirements: 6.1, 6.3, 6.4, 6.6, 14.6
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { apiRequest, ApiError } from '@/lib/api'
import type { EmergencyContact, RelationshipType } from '@/types/api'

// ---------------------------------------------------------------------------
// Query key
// ---------------------------------------------------------------------------

export const EMERGENCY_CONTACTS_QUERY_KEY = ['emergency-contacts', 'me'] as const

// ---------------------------------------------------------------------------
// Payload types
// ---------------------------------------------------------------------------

export interface EmergencyContactPayload {
  name: string
  relationship: RelationshipType
  phone_number: string
}

// ---------------------------------------------------------------------------
// Query: fetch current user's emergency contacts
// ---------------------------------------------------------------------------

export function useEmergencyContacts() {
  const router = useRouter()

  return useQuery<EmergencyContact[]>({
    queryKey: EMERGENCY_CONTACTS_QUERY_KEY,
    queryFn: async () => {
      try {
        return await apiRequest<EmergencyContact[]>('/api/emergency-contacts')
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
// Mutation: add a new emergency contact
// ---------------------------------------------------------------------------

export function useAddEmergencyContact() {
  const queryClient = useQueryClient()

  return useMutation<EmergencyContact, ApiError, EmergencyContactPayload>({
    mutationFn: (payload) =>
      apiRequest<EmergencyContact>('/api/emergency-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMERGENCY_CONTACTS_QUERY_KEY })
    },
  })
}

// ---------------------------------------------------------------------------
// Mutation: update an existing emergency contact
// ---------------------------------------------------------------------------

export function useUpdateEmergencyContact() {
  const queryClient = useQueryClient()

  return useMutation<
    EmergencyContact,
    ApiError,
    { id: string } & EmergencyContactPayload
  >({
    mutationFn: ({ id, ...payload }) =>
      apiRequest<EmergencyContact>(`/api/emergency-contacts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMERGENCY_CONTACTS_QUERY_KEY })
    },
  })
}

// ---------------------------------------------------------------------------
// Mutation: delete an emergency contact
// ---------------------------------------------------------------------------

export function useDeleteEmergencyContact() {
  const queryClient = useQueryClient()

  return useMutation<{ message: string }, ApiError, string>({
    mutationFn: (id) =>
      apiRequest<{ message: string }>(`/api/emergency-contacts/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMERGENCY_CONTACTS_QUERY_KEY })
    },
  })
}
