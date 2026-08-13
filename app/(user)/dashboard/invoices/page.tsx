/**
 * app/(user)/dashboard/invoices/page.tsx
 * Halaman tagihan user — menampilkan daftar invoice dan aksi pembayaran.
 */

import { InvoiceList } from '@/components/invoices/InvoiceList'

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Tagihan Saya</h1>
      <InvoiceList />
    </div>
  )
}
