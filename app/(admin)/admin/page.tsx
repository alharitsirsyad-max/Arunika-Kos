/**
 * app/(admin)/admin/page.tsx
 * Dashboard utama admin — Server Component.
 * Req 10.1 – 10.4
 */

import Link from 'next/link'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SummaryCards } from '@/components/admin/SummaryCards'
import {
  ClipboardListIcon,
  FileTextIcon,
  ShieldCheckIcon,
  ReceiptIcon,
  BedDoubleIcon,
} from 'lucide-react'

const NAV_LINKS = [
  { href: '/admin/rooms', icon: BedDoubleIcon, label: 'Kelola Kamar', desc: 'Tambah, edit, dan hapus kamar' },
  { href: '/admin/bookings', icon: ClipboardListIcon, label: 'Kelola Booking', desc: 'Setujui atau tolak pengajuan sewa' },
  { href: '/admin/reports', icon: FileTextIcon, label: 'Kelola Laporan', desc: 'Tindak lanjuti laporan penghuni' },
  { href: '/admin/identity', icon: ShieldCheckIcon, label: 'Verifikasi Identitas', desc: 'Periksa dokumen identitas penghuni' },
  { href: '/admin/invoices', icon: ReceiptIcon, label: 'Approve Invoice', desc: 'Setujui perpanjangan sewa yang lunas' },
]

export default async function AdminPage() {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session || role !== 'ADMIN') redirect('/forbidden')

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard Admin</h1>
        <p className="text-sm text-muted-foreground mt-1">Kelola sistem Arunika Kos</p>
      </div>

      {/* Ringkasan */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
          Ringkasan
        </h2>
        <SummaryCards />
      </section>

      {/* Navigasi */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
          Menu
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {NAV_LINKS.map(({ href, icon: Icon, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="flex items-start gap-3 rounded-lg border bg-card p-4 hover:bg-muted/40 transition-colors"
            >
              <Icon className="size-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
