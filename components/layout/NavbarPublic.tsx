'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'

export function NavbarPublic() {
  const { data: session, status } = useSession()
  const isLoading = status === 'loading'
  const isLoggedIn = !!session

  return (
    <header className="w-full border-b bg-background">
      <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="text-xl font-bold text-primary hover:opacity-80 transition-opacity"
        >
          Arunika Kos
        </Link>

        {/* Center links */}
        <div className="flex items-center gap-6">
          <Link
            href="/rooms"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Kamar
          </Link>
        </div>

        {/* Auth actions */}
        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
          ) : isLoggedIn ? (
            <>
              <span className="text-sm text-muted-foreground">
                {session.user?.name}
              </span>
              <Button render={<Link href="/dashboard" />} nativeButton={false} size="sm">
                Dashboard
              </Button>
            </>
          ) : (
            <>
              <Button render={<Link href="/login" />} nativeButton={false} variant="ghost" size="sm">
                Masuk
              </Button>
              <Button render={<Link href="/register" />} nativeButton={false} size="sm">
                Daftar
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
