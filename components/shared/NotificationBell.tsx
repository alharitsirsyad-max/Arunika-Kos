'use client'

/**
 * components/shared/NotificationBell.tsx
 *
 * Ikon lonceng notifikasi dengan badge unread count.
 * - Poll GET /api/notifications?limit=1 setiap 30 detik untuk unread count
 * - Badge: tampilkan "99+" jika n > 99, angka jika 0 < n ≤ 99, sembunyikan jika n = 0
 * - Klik membuka panel notifikasi via Popover (@base-ui/react/popover)
 *
 * Requirements: 11.2
 */

import { useQuery } from '@tanstack/react-query'
import { Popover } from '@base-ui/react/popover'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiRequest } from '@/lib/api'
import { NotificationPanel } from '@/components/shared/NotificationPanel'
import type { NotificationsResponse } from '@/types/api'

// ---------------------------------------------------------------------------
// Badge display logic (Req 11.2)
// ---------------------------------------------------------------------------

function formatBadgeCount(n: number): string {
  if (n > 99) return '99+'
  return String(n)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotificationBell() {
  // Poll for unread count every 30 seconds (Req 11.2)
  const { data } = useQuery<NotificationsResponse>({
    queryKey: ['notifications-count'],
    queryFn: () => apiRequest<NotificationsResponse>('/api/notifications?limit=1'),
    refetchInterval: 30_000,
  })

  const unreadCount = data?.unread_count ?? 0
  const showBadge = unreadCount > 0

  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={
          showBadge
            ? `Notifikasi — ${unreadCount} belum dibaca`
            : 'Notifikasi'
        }
        className={cn(
          'relative inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground',
          'transition-colors hover:bg-muted hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
          'data-popup-open:bg-muted data-popup-open:text-foreground'
        )}
      >
        <Bell className="size-5" />

        {/* Badge — Req 11.2 */}
        {showBadge && (
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute -top-0.5 -right-0.5',
              'inline-flex min-w-[1.125rem] items-center justify-center rounded-full',
              'bg-destructive px-1 py-px text-[0.625rem] font-semibold leading-none text-white',
              'border-2 border-background'
            )}
          >
            {formatBadgeCount(unreadCount)}
          </span>
        )}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="end"
          sideOffset={8}
          className="z-50"
        >
          <Popover.Popup
            className={cn(
              'w-80 origin-[var(--transform-origin)] rounded-xl bg-popover',
              'text-popover-foreground shadow-lg ring-1 ring-foreground/10 outline-none',
              'transition-[transform,opacity] duration-100 ease-out',
              'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
              'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95'
            )}
          >
            <NotificationPanel />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
