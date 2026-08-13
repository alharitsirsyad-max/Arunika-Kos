'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { apiRequest, ApiError } from '@/lib/api'
import type { Room } from '@/types/api'

export function useRooms() {
  const router = useRouter()
  return useQuery<Room[]>({
    queryKey: ['rooms'],
    queryFn: async () => {
      try {
        return await apiRequest<Room[]>('/api/rooms')
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) router.push('/login')
        throw error
      }
    },
  })
}

export interface CreateRoomPayload {
  name: string
  price: number
  period_months?: number
  description: string
  facilities: string[]
  capacity: number
  unit_count?: number
}

export function useCreateRoom() {
  const queryClient = useQueryClient()
  return useMutation<Room, ApiError, CreateRoomPayload>({
    mutationFn: (payload) =>
      apiRequest<Room>('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] }),
  })
}

export function useUpdateRoom(roomId: string) {
  const queryClient = useQueryClient()
  return useMutation<Room, ApiError, Partial<CreateRoomPayload>>({
    mutationFn: (payload) =>
      apiRequest<Room>(`/api/rooms/${roomId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] }),
  })
}

export function useDeleteRoom() {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, string>({
    mutationFn: (roomId) =>
      apiRequest<void>(`/api/rooms/${roomId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] }),
  })
}
