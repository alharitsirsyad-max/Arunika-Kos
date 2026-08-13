'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { apiRequest, ApiError } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserListItem {
  id: string
  name: string
  email: string
  role: string
  phone: string
  avatar_url: string | null
  created_at: string
}

export interface UserDetail {
  id: string
  name: string
  email: string
  phone: string
  role: string
  verification_status: string
  created_at: string
  ownedDocuments: {
    id: string
    document_type: string
    document_url: string | null
    verification_status: string
    verified_at: string | null
    created_at: string
  }[]
  emergency_contacts: {
    id: string
    name: string
    relationship: string
    phone_number: string
    created_at: string
  }[]
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useUsers(search?: string) {
  const router = useRouter()

  return useQuery<UserListItem[]>({
    queryKey: ['admin', 'users', search ?? ''],
    queryFn: async () => {
      try {
        const url = search ? `/api/users?search=${encodeURIComponent(search)}` : '/api/users'
        return await apiRequest<UserListItem[]>(url)
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) router.push('/login')
        throw error
      }
    },
  })
}

export function useUserDetail(userId: string | null) {
  return useQuery<UserDetail>({
    queryKey: ['admin', 'users', userId],
    queryFn: () => apiRequest<UserDetail>(`/api/users/${userId}`),
    enabled: !!userId,
  })
}
