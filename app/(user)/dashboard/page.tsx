import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { IdentityBannerClient } from '@/components/dashboard/IdentityBanner'
import { BookingList } from '@/components/dashboard/BookingList'
import { DashboardActiveBookingPanel } from '@/components/user/DashboardActiveBookingPanel'

/**
 * app/(user)/dashboard/page.tsx
 * Server Component — Dashboard utama user.
 *
 * Struktur halaman:
 * 1. Header (sambutan)
 * 2. IdentityBannerClient — status verifikasi identitas
 * 3. DashboardActiveBookingPanel — status booking terkini:
 *    - Empty state + tautan /rooms jika tidak ada booking aktif (Req 14.1)
 *    - BookingStepIndicator: lifecycle PENDING → DP_PENDING → DP_PAID → ACTIVE → DONE (Req 14.2)
 *    - AgreementSummary: ditampilkan saat status DP_PAID (Req 14.3, 14.4)
 *    - RenewalBanner: ditampilkan saat ACTIVE + Agreement CONFIRMED + sisa ≤ 30 hari (Req 14.7)
 * 4. BookingList — daftar lengkap semua booking user
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4
 */
export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <main className="min-h-screen p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Selamat datang,{' '}
            <span className="font-medium text-foreground">{session.user?.name}</span>!
          </p>
        </div>

        {/* Identity Banner — fetches its own status via useIdentityStatus() */}
        <IdentityBannerClient />

        {/* Status Booking Terkini — step indicator, agreement summary, renewal banner */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Status Booking Terkini</h2>
          <DashboardActiveBookingPanel />
        </section>

        {/* Daftar Lengkap Booking */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Semua Booking</h2>
          <BookingList />
        </section>
      </div>
    </main>
  )
}
