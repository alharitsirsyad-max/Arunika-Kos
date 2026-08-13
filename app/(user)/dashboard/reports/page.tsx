/**
 * app/(user)/dashboard/reports/page.tsx
 * Halaman laporan masalah user — Server Component.
 * Req 9.1 – 9.6
 */

import { ReportForm } from '@/components/reports/ReportForm'

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Laporan Masalah</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Laporkan masalah yang Anda temui terkait website maupun kondisi kamar.
        </p>
      </div>

      <section className="rounded-lg border bg-card p-5 max-w-2xl">
        <ReportForm />
      </section>
    </div>
  )
}
