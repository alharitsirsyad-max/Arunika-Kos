'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { LogOut, LayoutDashboard, BedDouble, ClipboardList, FileText, ShieldCheck, Users, BarChart3, Globe } from 'lucide-react'
import { NotificationBell } from '@/components/shared/NotificationBell'

const NAV_GROUPS = [
  {
    label: 'OVERVIEW',
    links: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: 'OPERASIONAL',
    links: [
      { href: '/admin/rooms', label: 'Kamar', icon: BedDouble, exact: false },
      { href: '/admin/bookings', label: 'Booking', icon: ClipboardList, exact: false },
      { href: '/admin/invoices', label: 'Invoice', icon: FileText, exact: false },
    ],
  },
  {
    label: 'PENGHUNI',
    links: [
      { href: '/admin/identity', label: 'Identitas', icon: ShieldCheck, exact: false },
      { href: '/admin/users', label: 'Pengguna', icon: Users, exact: false },
    ],
  },
  {
    label: 'SUPPORT',
    links: [
      { href: '/admin/reports', label: 'Laporan', icon: BarChart3, exact: false },
    ],
  },
]

export function NavbarAdmin() {
  const pathname = usePathname()
  const { data: session } = useSession()

  async function handleSignOut() {
    await signOut({ callbackUrl: '/' })
  }

  return (
    <header className="w-full border-b bg-background">
      <nav className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/admin" className="text-base font-bold text-primary hover:opacity-80 transition-opacity shrink-0">
          Arunika Kos
        </Link>

        {/* Nav groups */}
        <div className="flex items-center gap-0.5 overflow-x-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="flex items-center">
              {/* Group divider except first */}
              {group.label !== 'OVERVIEW' && (
                <div className="w-px h-4 bg-border mx-1 shrink-0" />
              )}
              {group.links.map(({ href, label, icon: Icon, exact }) => {
                const isActive = exact ? pathname === href : pathname.startsWith(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    {label}
                  </Link>
                )
              })}
            </div>
          ))}
        </div>

        {/* Right: notifikasi + info + logout */}
        <div className="flex items-center gap-1 shrink-0">
          <NotificationBell />
          {session?.user?.name && (
            <span className="hidden lg:block text-xs text-muted-foreground px-1">
              {session.user.name}
            </span>
          )}
          <Button render={<Link href="/" />} nativeButton={false} variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground">
            <Globe className="size-3.5" />
            <span className="hidden sm:block">Website</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1.5 text-xs text-muted-foreground hover:text-destructive">
            <LogOut className="size-3.5" />
            <span className="hidden sm:block">Keluar</span>
          </Button>
        </div>
      </nav>
    </header>
  )
}
