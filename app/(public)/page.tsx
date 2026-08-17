'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { CalendarCheck, ShieldCheck, Smartphone } from 'lucide-react'

const FEATURES = [
  {
    icon: Smartphone,
    title: 'Booking Online',
    description:
      'Ajukan sewa kamar kapan saja dan di mana saja tanpa perlu datang langsung.',
  },
  {
    icon: ShieldCheck,
    title: 'Pembayaran Aman',
    description:
      'Transaksi diproses melalui Midtrans dengan enkripsi penuh untuk keamanan Anda.',
  },
  {
    icon: CalendarCheck,
    title: 'Verifikasi Mudah',
    description:
      'Upload dokumen identitas sekali, verifikasi cepat oleh admin, dan langsung bisa booking.',
  },
]

export default function HomePage() {
  const { data: session, status } = useSession()
  const isLoading = status === 'loading'
  const isLoggedIn = !!session
  const role = (session?.user as { role?: string })?.role
  const dashboardHref = role === 'ADMIN' ? '/admin' : '/dashboard'

  return (
    <main className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] gap-6 px-4 py-16 text-center bg-background">
        <h1 className="text-5xl font-bold tracking-tight">Arunika Kos</h1>
        <p className="text-xl text-muted-foreground font-medium">
          Hunian nyaman, proses mudah, harga terjangkau.
        </p>
        <p className="text-base text-muted-foreground max-w-lg">
          Temukan kamar kos terbaik yang sesuai kebutuhan Anda. Booking online,
          bayar aman, dan verifikasi mudah — semuanya dalam satu platform.
        </p>

        <div className="flex flex-wrap gap-3 justify-center mt-2">
          <Button render={<Link href="/rooms" />} nativeButton={false} size="lg">
            Lihat Kamar
          </Button>

          {isLoading ? (
            <div className="h-11 w-36 animate-pulse rounded-md bg-muted" />
          ) : isLoggedIn ? (
            <Button render={<Link href={dashboardHref} />} nativeButton={false} variant="outline" size="lg">
              Ke Dashboard
            </Button>
          ) : (
            <Button render={<Link href="/login" />} nativeButton={false} variant="outline" size="lg">
              Masuk
            </Button>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full bg-muted/40 py-16 px-4">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-10">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Kenapa Arunika Kos?</h2>
            <p className="mt-2 text-muted-foreground">
              Kami hadir untuk mempermudah pengalaman sewa kos Anda.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex flex-col items-center text-center gap-3 rounded-xl border bg-background p-6 shadow-sm"
              >
                <div className="rounded-full bg-primary/10 p-3">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
