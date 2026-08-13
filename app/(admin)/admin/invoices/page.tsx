/**
 * app/(admin)/admin/invoices/page.tsx
 * Halaman semua invoice untuk admin — lihat status pembayaran, setujui perpanjangan.
 */

import { AdminInvoiceTable } from '@/components/admin/AdminInvoiceTable'

export default function AdminInvoicesPage() {
  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Kelola Invoice</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor status pembayaran semua penyewa dan setujui perpanjangan sewa.
        </p>
      </div>

      <AdminInvoiceTable />
    </main>
  )
}
