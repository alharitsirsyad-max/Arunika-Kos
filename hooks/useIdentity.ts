'use client'

/**
 * hooks/useIdentity.ts
 * Custom hooks for identity document operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { apiRequest, ApiError } from '@/lib/api'
import type {
  IdentityDocumentPublic,
  IdentityStatus,
  VerificationStatus,
} from '@/types/api'

// ---------------------------------------------------------------------------
// Query: fetch current user's identity documents
// ---------------------------------------------------------------------------

export function useMyIdentityDocuments() {
  const router = useRouter()

  return useQuery<IdentityDocumentPublic[]>({
    queryKey: ['identity-documents', 'me'],
    queryFn: async () => {
      try {
        return await apiRequest<IdentityDocumentPublic[]>('/api/identity-documents/me')
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
// Query: fetch identity verification status for current user
// ---------------------------------------------------------------------------

export function useIdentityStatus() {
  const router = useRouter()

  return useQuery<IdentityStatus>({
    queryKey: ['identity-documents', 'status'],
    queryFn: async () => {
      try {
        return await apiRequest<IdentityStatus>('/api/identity-documents/status')
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
// Mutation: upload a new identity document (FormData)
// ---------------------------------------------------------------------------

export function useUploadIdentityDocument() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation<IdentityDocumentPublic, ApiError, FormData>({
    mutationFn: async (formData) => {
      try {
        // Do NOT set Content-Type — browser sets it with the correct boundary
        return await apiRequest<IdentityDocumentPublic>('/api/identity-documents', {
          method: 'POST',
          body: formData,
        })
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          router.push('/login')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['identity-documents'] })
    },
  })
}

// ---------------------------------------------------------------------------
// Admin identity document type (includes user info + document_url)
// ---------------------------------------------------------------------------

export interface AdminIdentityDoc {
  id: string
  user_id: string
  document_type: string
  document_url: string | null
  verification_status: VerificationStatus
  verified_at: string | null
  created_at: string
  user: { id: string; name: string; email: string } | null
}

// ---------------------------------------------------------------------------
// Query: fetch all identity documents (admin)
// ---------------------------------------------------------------------------

export function useAllIdentityDocuments() {
  const router = useRouter()

  return useQuery<AdminIdentityDoc[]>({
    queryKey: ['identity-documents', 'all'],
    queryFn: async () => {
      try {
        return await apiRequest<AdminIdentityDoc[]>('/api/identity-documents')
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
// Mutation: verify or reject an identity document (admin)
// ---------------------------------------------------------------------------

export interface VerifyIdentityDocumentPayload {
  verification_status: 'VERIFIED' | 'REJECTED'
}

export function useVerifyIdentityDocument(documentId: string) {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation<IdentityDocumentPublic, ApiError, VerifyIdentityDocumentPayload>({
    mutationFn: async (payload) => {
      try {
        return await apiRequest<IdentityDocumentPublic>(
          `/api/identity-documents/${documentId}/verify`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        )
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          router.push('/login')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['identity-documents'] })
    },
  })
}
