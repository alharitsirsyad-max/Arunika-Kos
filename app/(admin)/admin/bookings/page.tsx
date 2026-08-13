/**
 * app/(admin)/admin/bookings/page.tsx
 * Halaman kelola booking untuk admin — Server Component.
 * Req 11.1 – 11.6
 */

import { BookingTable } from '@/components/admin/BookingTable'

export default function AdminBookingsPage() {
  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Kelola Booking</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Setujui atau tolak pengajuan sewa dari penghuni.
        </p>
      </div>

      <BookingTable />
    </main>
  )
}
