'use client'

/**
 * components/shared/NotificationPanel.tsx
 *
 * Menampilkan daftar notifikasi user.
 * - Fetch dari GET /api/notifications
 * - Empty state jika tidak ada notifikasi
 * - Setiap item: tampilkan pesan, waktu, status baca; klik tandai baca & navigasi
 * - Tombol "Tandai semua dibaca"
 *
 * Requirements: 11.3, 11.4
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiRequest, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import type { Notification, NotificationsResponse, NotificationType } from '@/types/api'

// ---------------------------------------------------------------------------
// Navigation map per notification type (Req 11.3)
// ---------------------------------------------------------------------------

function getNavigationUrl(type: NotificationType, relatedBookingId: string | null): string {
  switch (type) {
    // User notifications
    case 'BOOKING_ACTIVE':
    case 'BOOKING_APPROVED':
    case 'BOOKING_REJECTED':
    case 'BOOKING_EXPIRED':
    case 'BOOKING_CANCELLED':
      return '/dashboard'
    case 'RENEWAL_REMINDER':
    case 'EXTENSION_APPROVED':
    case 'EXTENSION_REJECTED':
      return '/dashboard/invoices'
    case 'IDENTITY_VERIFIED':
    case 'IDENTITY_REJECTED':
    case 'ACCOUNT_BLOCKED':
      return '/dashboard/identity'
    // Admin notifications
    case 'BOOKING_PENDING':
      return '/admin/bookings'
    case 'PAYMENT_RECEIVED':
      return '/admin/invoices'
    case 'REPORT_SUBMITTED':
      return '/admin/reports'
    case 'RE_VERIFICATION_REQUESTED':
      return '/admin/identity'
    case 'AGREEMENT_CONFIRMED':
      return '/dashboard'
    default:
      return '/dashboard'
  }
}

// ---------------------------------------------------------------------------
// Relative time formatter
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'Baru saja'
  if (diffMin < 60) return `${diffMin} menit lalu`
  if (diffHour < 24) return `${diffHour} jam lalu`
  if (diffDay === 1) return 'Kemarin'
  if (diffDay < 7) return `${diffDay} hari lalu`

  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ---------------------------------------------------------------------------
// Individual notification item
// ---------------------------------------------------------------------------

interface NotificationItemProps {
  notification: Notification
  onRead: (id: string) => void
  isMarkingRead: boolean
}

function NotificationItem({ notification, onRead, isMarkingRead }: NotificationItemProps) {
  const router = useRouter()

  function handleClick() {
    if (!notification.is_read) {
      onRead(notification.id)
    }
    const url = getNavigationUrl(notification.type, notification.related_booking_id)
    router.push(url)
  }

  return (
    <button
      onClick={handleClick}
      disabled={isMarkingRead}
      className={cn(
        'w-full text-left px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:bg-muted/60',
        !notification.is_read && 'bg-primary/5'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Unread dot */}
        <span
          className={cn(
            'mt-1.5 size-2 shrink-0 rounded-full',
            notification.is_read ? 'bg-transparent' : 'bg-primary'
          )}
          aria-hidden="true"
        />

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'text-sm leading-snug',
              notification.is_read ? 'text-muted-foreground' : 'text-foreground font-medium'
            )}
          >
            {notification.message}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatRelativeTime(notification.created_at)}
          </p>
        </div>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export function NotificationPanel() {
  const queryClient = useQueryClient()

  // Fetch full notifications list
  const { data, isLoading, isError } = useQuery<NotificationsResponse>({
    queryKey: ['notifications'],
    queryFn: () => apiRequest<NotificationsResponse>('/api/notifications'),
  })

  // Mutation: mark single notification as read
  const markReadMutation = useMutation<unknown, ApiError, string>({
    mutationFn: (id: string) =>
      apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] })
    },
  })

  // Mutation: mark all notifications as read
  const markAllReadMutation = useMutation<unknown, ApiError, void>({
    mutationFn: () =>
      apiRequest('/api/notifications/read-all', { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] })
    },
  })

  const notifications = data?.notifications ?? []
  const hasUnread = notifications.some((n) => !n.is_read)

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="text-sm font-semibold">Notifikasi</h3>
        {hasUnread && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <CheckCheck className="size-3.5" />
            Tandai semua dibaca
          </Button>
        )}
      </div>

      {/* Body */}
      <div className="max-h-80 overflow-y-auto">
        {isLoading && (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            Memuat...
          </div>
        )}

        {isError && (
          <div className="px-4 py-6 text-center text-sm text-destructive">
            Gagal memuat notifikasi.
          </div>
        )}

        {/* Empty state — Req 11.4 */}
        {!isLoading && !isError && notifications.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <Bell className="size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Tidak ada notifikasi saat ini</p>
          </div>
        )}

        {/* Notification list — Req 11.3 */}
        {!isLoading && !isError && notifications.length > 0 && (
          <div className="divide-y">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={(id) => markReadMutation.mutate(id)}
                isMarkingRead={markReadMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
