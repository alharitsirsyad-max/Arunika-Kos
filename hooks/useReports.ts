'use client'

/**
 * hooks/useReports.ts
 * Custom hooks for report operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { apiRequest, ApiError } from '@/lib/api'
import type { Report, ReportType, ReportStatus } from '@/types/api'

// ---------------------------------------------------------------------------
// Mutation: create a new report
// ---------------------------------------------------------------------------

export interface CreateReportPayload {
  type: ReportType
  title: string
  description: string
}

export function useCreateReport() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation<Report, ApiError, CreateReportPayload>({
    mutationFn: async (payload) => {
      try {
        return await apiRequest<Report>('/api/reports', {
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
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
  })
}

// ---------------------------------------------------------------------------
// Query: fetch all reports (admin)
// ---------------------------------------------------------------------------

export function useAllReports() {
  const router = useRouter()

  return useQuery<Report[]>({
    queryKey: ['reports'],
    queryFn: async () => {
      try {
        return await apiRequest<Report[]>('/api/reports')
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
// Mutation: update report status (admin)
// ---------------------------------------------------------------------------

export interface UpdateReportStatusPayload {
  status: ReportStatus
  admin_note?: string
}

export function useUpdateReportStatus(reportId: string) {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation<Report, ApiError, UpdateReportStatusPayload>({
    mutationFn: async (payload) => {
      try {
        return await apiRequest<Report>(`/api/reports/${reportId}/status`, {
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
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
  })
}
