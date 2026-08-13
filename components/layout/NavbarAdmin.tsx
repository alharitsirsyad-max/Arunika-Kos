'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { NotificationBell } from '@/components/shared/NotificationBell'

const navLinks = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/rooms', label: 'Kamar' },
  { href: '/admin/bookings', label: 'Booking' },
  { href: '/admin/reports', label: 'Laporan' },
  { href: '/admin/identity', label: 'Identitas' },
  { href: '/admin/invoices', label: 'Invoice' },
  { href: '/admin/users', label: 'Pengguna' },
]

export function NavbarAdmin() {
  const pathname = usePathname()

  async function handleSignOut() {
    await signOut({ callbackUrl: '/' })
  }

  return (
    <header className="w-full border-b bg-background">
      <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/admin"
          className="text-xl font-bold text-primary hover:opacity-80 transition-opacity"
        >
          Arunika Kos
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {navLinks.map(({ href, label }) => {
            const isActive =
              href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                {label}
              </Link>
            )
          })}
        </div>

        {/* Logout */}
        <div className="flex items-center gap-1">
          <NotificationBell />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="gap-2 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Keluar
          </Button>
        </div>
      </nav>
    </header>
  )
}
