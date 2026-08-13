/**
 * app/(admin)/admin/reports/page.tsx
 * Halaman kelola laporan untuk admin — Server Component.
 * Req 12.1 – 12.6
 */

import { ReportTable } from '@/components/admin/ReportTable'

export default function AdminReportsPage() {
  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Kelola Laporan</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Klik baris laporan untuk melihat detail dan memperbarui status.
        </p>
      </div>

      <ReportTable />
    </main>
  )
}
