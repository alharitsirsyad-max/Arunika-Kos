'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useRooms } from '@/hooks/useRooms'
import { useMyActiveBooking } from '@/hooks/useBookings'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { RoomCard } from '@/components/rooms/RoomCard'
import { BookingModal } from '@/components/rooms/BookingModal'
import type { Room } from '@/types/api'

function RoomCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border bg-card shadow-sm overflow-hidden animate-pulse">
      <div className="w-full h-48 bg-muted" />
      <div className="flex flex-col gap-3 p-4">
        <div className="h-4 w-2/3 rounded bg-muted" />
        <div className="h-5 w-1/2 rounded bg-muted" />
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-4/5 rounded bg-muted" />
        <div className="flex gap-1.5 mt-1">
          <div className="h-5 w-16 rounded-full bg-muted" />
          <div className="h-5 w-20 rounded-full bg-muted" />
        </div>
        <div className="mt-auto pt-2 h-9 rounded-lg bg-muted" />
      </div>
    </div>
  )
}

export function RoomList() {
  const router = useRouter()
  const { data: session, status: authStatus } = useSession()
  const { data: rooms, isLoading, isError, refetch, error } = useRooms()
  const isAdmin = (session?.user as { role?: string })?.role === 'ADMIN'

  // Cek apakah user sudah punya booking aktif (hanya jika logged in dan bukan admin)
  const { data: activeBookingStatus } = useMyActiveBooking()
  const userHasActiveBooking = authStatus === 'authenticated' && !isAdmin && (activeBookingStatus?.has_active ?? false)

  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)

  const handleBookingClick = (room: Room) => {
    if (authStatus === 'loading') return
    if (authStatus === 'unauthenticated') {
      router.push('/login?callbackUrl=/rooms')
      return
    }
    if (isAdmin) return // Admin tidak bisa booking
    setSelectedRoom(room)
  }

  const handleModalClose = () => {
    setSelectedRoom(null)
  }

  if (isLoading) {
    return (
      <div
        aria-busy="true"
        aria-label="Memuat daftar kamar..."
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <RoomCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (isError) {
    const message = error instanceof Error
      ? error.message
      : 'Gagal memuat daftar kamar. Silakan coba lagi.'
    return (
      <ErrorMessage message={message} onRetry={() => refetch()} className="max-w-sm mx-auto mt-8" />
    )
  }

  if (!rooms || rooms.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12">
        Belum ada kamar yang tersedia saat ini.
      </p>
    )
  }

  return (
    <>
      {/* Info jika user sudah punya booking aktif */}
      {userHasActiveBooking && activeBookingStatus?.booking && (
        <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Anda sedang memiliki booking aktif untuk{' '}
          <strong>{activeBookingStatus.booking.room_unit.room.name}</strong>.
          Selesaikan booking tersebut sebelum membooking kamar lain.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            onBooking={handleBookingClick}
            userHasActiveBooking={userHasActiveBooking}
            isAdmin={isAdmin}
          />
        ))}
      </div>

      {selectedRoom && (
        <BookingModal
          key={selectedRoom.id}
          room={selectedRoom}
          open={true}
          onClose={handleModalClose}
        />
      )}
    </>
  )
}
