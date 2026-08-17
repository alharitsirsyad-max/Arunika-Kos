/**
 * app/(admin)/admin/bookings/page.tsx
 * Halaman kelola booking untuk admin — Server Component.
 * Req 11.1 – 11.6
 */

import { BookingTable } from '@/components/admin/BookingTable'
import { ExtensionRequestTable } from '@/components/admin/ExtensionRequestTable'

export default function AdminBookingsPage() {
  return (
    <main className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Kelola Booking</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Setujui atau tolak pengajuan sewa dari penghuni.
        </p>
      </div>

      <BookingTable />

      <div>
        <h2 className="text-xl font-semibold mb-1">Permintaan Perpanjangan</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Tinjau dan setujui permintaan perpanjangan sewa dari penghuni aktif.
        </p>
        <ExtensionRequestTable />
      </div>
    </main>
  )
}
