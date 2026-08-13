/**
 * app/(admin)/admin/identity/page.tsx
 * Halaman verifikasi identitas untuk admin — Server Component.
 * Req 13.1 – 13.6
 */

import { IdentityTable } from '@/components/admin/IdentityTable'

export default function AdminIdentityPage() {
  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Verifikasi Identitas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Periksa dan verifikasi dokumen identitas yang diupload penghuni.
        </p>
      </div>

      <IdentityTable />
    </main>
  )
}
